import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from './token.service';
import { SecurityUtil } from '../utils/security.util';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { NotificationResourceType, NotificationType, UserRole, UserStatus } from 'prisma/generated/prisma/enums';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, User } from 'prisma/generated/prisma/browser';
import { DeviceInfo } from '../utils/device-info.decorator';
import {
  RekognitionClient,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  InvalidImageFormatException,
  ProvisionedThroughputExceededException,
  InternalServerError,
  DeleteCollectionCommand,
  CreateCollectionCommand,
  RekognitionServiceException,
  GetFaceLivenessSessionResultsCommand,
  CreateFaceLivenessSessionCommand,
  DeleteFacesCommand
} from "@aws-sdk/client-rekognition";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';

@Injectable()
export class AuthService {
  private readonly rekognition: RekognitionClient;
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(AuthService.name);
  private readonly collectionId: string;
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
    private readonly notificationGateway: NotificationGateway
  ) {

    const s3Region = this.config.getOrThrow<string>('aws.region');
    const rekognitionRegion = this.config.getOrThrow<string>('aws.regionFace');

    const credentials = {
      accessKeyId: this.config.getOrThrow<string>('aws.accessKeyId'),
      secretAccessKey: this.config.getOrThrow<string>('aws.secretAccessKey'),
    };

    this.s3Client = new S3Client({
      region: s3Region,
      credentials,
    });


    this.rekognition = new RekognitionClient({
      region: rekognitionRegion,
      credentials,
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 3000,
        socketTimeout: 3000,
      }),
    });

    this.collectionId = this.config.getOrThrow<string>('aws.AWS_REKOGNITION_COLLECTION_ID').toLowerCase();
    this.bucketName = this.config.getOrThrow<string>('aws.bucketName');
  }

  async register(payload: RegisterDto, device: DeviceInfo) {
    const existing = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) throw new ConflictException('Email already registered');

    const rounds = this.config.get<number>('security.bcrypt_salt_rounds') || 12;
    const hashedPassword = await SecurityUtil.hashData(payload.password, rounds);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          password: hashedPassword,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
        },
      });
      return this.issueTokens(user, device, tx);
    });
  }

  async login(payload: LoginDto, device: DeviceInfo) {
    if (!payload.email || !payload.password) throw new UnauthorizedException('Missing credentials');

    const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException('Account temporarily locked');
    }

    const isPasswordValid = await SecurityUtil.compareData(payload.password, user.password);

    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockUntil: null },
      });
      return this.issueTokens(user, device, tx);
    });
  }

  async refresh(refreshToken: string, device: DeviceInfo) {
    const payload = await this.tokenService.verifyRefresh(refreshToken);
    const { jti, sub: userId } = payload;

    const session = await this.prisma.refreshToken.findUnique({ where: { jti } });

    if (!session || session.isRevoked || session.userId !== userId) {
      if (session) await this.clearUserSessions(userId);
      throw new UnauthorizedException('Invalid or compromised session');
    }

    const isValid = await SecurityUtil.compareData(refreshToken, session.tokenHash);
    if (!isValid) {
      await this.clearUserSessions(userId);
      throw new UnauthorizedException('Token mismatch');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({ where: { id: session.id } });
      return this.issueTokens(user, device, tx);
    });
  }

  async logout(userId: string, userAgent: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, userAgent },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  // async setupFaceBiometric(userId: string, faceImage: Buffer) {
  //   const existingBiometric = await this.prisma.faceBiometric.findUnique({
  //     where: { userId },
  //   });

  //   if (existingBiometric) {
  //     throw new ConflictException('Biometric profile already exists for this account.');
  //   }

  //   try {
  //     const response = await this.rekognition.send(new IndexFacesCommand({
  //       CollectionId: this.collectionId,
  //       Image: {
  //         Bytes: new Uint8Array(faceImage)
  //       },
  //       ExternalImageId: userId,
  //       MaxFaces: 1,
  //       DetectionAttributes: ['DEFAULT'],
  //     }));

  //     if (!response.FaceRecords || response.FaceRecords.length === 0) {
  //       throw new BadRequestException('Face not detected clearly. Please ensure your face is well-lit and visible.');
  //     }

  //     const faceId = response.FaceRecords[0].Face?.FaceId;
  //     if (!faceId) {
  //       throw new InternalServerErrorException('Biometric capture failed. Could not generate a face signature.');
  //     }
  //     await this.sendAuthNotification(userId, 'Face Setup Success', 'Your face biometric has been successfully registered.', 'SETUP');

  //     return await this.prisma.faceBiometric.create({
  //       data: {
  //         userId,
  //         rekognitionId: faceId,
  //         version: 1,
  //       },
  //     });
  //   } catch (error) {
  //     this.handleBiometricError(error);
  //   }
  // }

  async setupFaceBiometric(userId: string, faceImage: Buffer) {
  const existingBiometric = await this.prisma.faceBiometric.findUnique({
    where: { userId },
  });

  if (existingBiometric) {
    throw new ConflictException('A biometric profile is already linked to your account.');
  }

  try {
    const imageBytes = new Uint8Array(faceImage);
    const searchResponse = await this.rekognition.send(new SearchFacesByImageCommand({
      CollectionId: this.collectionId,
      Image: { Bytes: imageBytes },
      MaxFaces: 1,
      FaceMatchThreshold: 95, 
    }));

    if (searchResponse.FaceMatches && searchResponse.FaceMatches.length > 0) {
      throw new ConflictException('This face is already registered to another user.');
    }

    const indexResponse = await this.rekognition.send(new IndexFacesCommand({
      CollectionId: this.collectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: userId,
      MaxFaces: 1,
      DetectionAttributes: ['DEFAULT'],
    }));

    const faceId = indexResponse.FaceRecords?.[0]?.Face?.FaceId;
    if (!faceId) {
      throw new BadRequestException('Face not detected clearly. Please try again.');
    }
    try {
      const newBiometric = await this.prisma.faceBiometric.create({
        data: {
          userId,
          rekognitionId: faceId,
          version: 1,
        },
      });

      await this.sendAuthNotification(userId, 'Face Setup Success', 'Biometrics registered.', 'SETUP');
      return newBiometric;

    } catch (dbError) {
      await this.rekognition.send(new DeleteFacesCommand({
        CollectionId: this.collectionId,
        FaceIds: [faceId]
      }));
      throw new InternalServerErrorException('Failed to save biometric record. Please try again.');
    }

  } catch (error) {
    this.handleBiometricError(error);
  }
}

  async loginWithFace(faceImage: Buffer, device: DeviceInfo) {
    try {
      const response = await this.rekognition.send(new SearchFacesByImageCommand({
        CollectionId: this.collectionId,
        Image: { Bytes: new Uint8Array(faceImage) },
        MaxFaces: 1,
        FaceMatchThreshold: 95,
      }));

      if (!response.FaceMatches || response.FaceMatches.length === 0) {
        throw new UnauthorizedException('Face not recognized.');
      }

      const faceId = response.FaceMatches[0].Face?.FaceId;
      const confidence = response.FaceMatches[0].Similarity;

      if (!faceId || (confidence && confidence < 95)) {
        throw new UnauthorizedException('Identity could not be verified.');
      }

      const biometric = await this.prisma.faceBiometric.findUnique({
        where: { rekognitionId: faceId },
        include: { user: true },
      });

      if (!biometric || !biometric.user) {
        throw new UnauthorizedException('Biometric profile not linked.');
      }

      if (biometric.user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException(`Account is ${biometric.user.status.toLowerCase()}`);
      }

      await this.sendAuthNotification(biometric.user.id, 'New Face Login', `Successfully logged in from ${device.userAgent}`, 'LOGIN');

      return await this.prisma.$transaction(async (tx) => {
        await tx.faceBiometric.update({
          where: { id: biometric.id },
          data: { lastUsedAt: new Date() },
        });
        return this.issueTokens(biometric.user, device, tx);
      });
    } catch (error) {
      this.handleBiometricError(error);
    }
  }

  private handleBiometricError(error: any) {
    this.logger.error(`Auth Error: ${error.message}`, error.stack);

    if (error instanceof RekognitionServiceException) {
      throw new InternalServerErrorException('Biometric service is currently unavailable.');
    }
    if (error.status && error.status < 500) {
      throw error;
    }

    throw new InternalServerErrorException('An unexpected security error occurred.');
  }


  async resetFaceCollection() {
    try {
      try {
        await this.rekognition.send(new DeleteCollectionCommand({ CollectionId: this.collectionId }));
      } catch (err) {
        if (err.name !== 'ResourceNotFoundException') throw err;
      }

      await this.rekognition.send(new CreateCollectionCommand({ CollectionId: this.collectionId }));
      await this.prisma.faceBiometric.deleteMany({});

      return { message: 'Biometric storage has been fully reset.' };
    } catch (error) {
      this.logger.error('Reset Failed:', error);
      throw new InternalServerErrorException('Could not reset collection.');
    }
  }

  private async issueTokens(user: User, device: DeviceInfo, tx: Prisma.TransactionClient) {
    const activeSessions = await tx.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (activeSessions.length >= 5) {
      await tx.refreshToken.delete({ where: { id: activeSessions[0].id } });
    }

    const { accessToken, refreshToken, jti } = await this.tokenService.generateTokens({
      id: user.id, email: user.email, role: user.role,
    });

    const tokenHash = await SecurityUtil.hashData(refreshToken);
    const ttlDays = this.config.get<number>('jwt.refresh_ttl_days') || 7;

    await tx.refreshToken.create({
      data: {
        jti, tokenHash, userId: user.id,
        userAgent: device.userAgent, ipAddress: device.ip,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private async clearUserSessions(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  ///notification helper 
  private async sendAuthNotification(
    userId: string,
    title: string,
    body: string,
    action: 'SETUP' | 'LOGIN'
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          title,
          body,
          type: NotificationType.SYSTEM,
          resourceType: NotificationResourceType.IDEATED_VERIFIED,
          actorType: 'SYSTEM',
          metadata: { action, timestamp: new Date().toISOString() },
          recipients: { create: { userId, isRead: false } },
        },
      });

      this.notificationGateway.sendNotificationToUser(userId, {
        notificationId: notification.id,
        title,
        body,
        type: notification.type,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      this.logger.error(`[Auth Notification Error]`, error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens() {
    await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }] },
    });
  }

  ////-------

async createLivenessSession() {
  const session = await this.rekognition.send(new CreateFaceLivenessSessionCommand({}));
  return {
    sessionId: session.SessionId,
    // credentials: {
    //   accessKeyId: this.config.get('aws.accessKeyId'),
    //   secretAccessKey: this.config.get('aws.secretAccessKey'),
    // }
  };
}

  async setupFaceLive(userId: string, sessionId: string) {
    console.log("Processing Session:", sessionId);
    const existing = await this.prisma.faceBiometric.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Biometric profile already exists');

    const { referenceImage, confidence } = await this.getLivenessResults(sessionId);
    if (confidence < 90) throw new BadRequestException('Liveness verification failed');

    try {
      const indexResponse = await this.rekognition.send(new IndexFacesCommand({
        CollectionId: this.collectionId,
        Image: { Bytes: referenceImage },
        ExternalImageId: userId,
        MaxFaces: 1,
      }));

      const faceId = indexResponse.FaceRecords?.[0]?.Face?.FaceId;
      if (!faceId) throw new InternalServerErrorException('Face indexing failed');

      return await this.prisma.faceBiometric.create({
        data: {
          userId,
          rekognitionId: faceId,
          version: 1,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error during biometric enrollment');
    }
  }

  async loginWithFaceLive(sessionId: string, device: DeviceInfo) {
    const { referenceImage, confidence } = await this.getLivenessResults(sessionId);
    if (confidence < 95) throw new UnauthorizedException('Liveness confidence too low');

    const searchResponse = await this.rekognition.send(new SearchFacesByImageCommand({
      CollectionId: this.collectionId,
      Image: { Bytes: referenceImage },
      MaxFaces: 1,
      FaceMatchThreshold: 95,
    }));

    const faceMatch = searchResponse.FaceMatches?.[0];
    if (!faceMatch || !faceMatch.Face?.FaceId) throw new UnauthorizedException('Face not recognized');

    const biometric = await this.prisma.faceBiometric.findUnique({
      where: { rekognitionId: faceMatch.Face.FaceId },
      include: { user: true },
    });

    if (!biometric?.user) throw new UnauthorizedException('Identity not linked');
    if (biometric.user.status !== 'ACTIVE') throw new UnauthorizedException('Account inactive');

    return await this.prisma.$transaction(async (tx) => {
      await tx.faceBiometric.update({
        where: { id: biometric.id },
        data: { lastUsedAt: new Date() },
      });
      return this.issueTokens(biometric.user, device, tx);
    });
  }


private async getLivenessResults(sessionId: string) {
  try {
    const response = await this.rekognition.send(new GetFaceLivenessSessionResultsCommand({
      SessionId: sessionId
    }));

    this.logger.log(`Session Status: ${response.Status}`);

    if (response.Status !== 'SUCCEEDED') {
       throw new BadRequestException(`Liveness check not completed. Status: ${response.Status}`);
    }
    
    return {
      referenceImage: response.ReferenceImage?.Bytes,
      confidence: response.Confidence || 0,
    };
  } catch (error) {
    this.logger.error('AWS Liveness Result Error:', error);
    throw new BadRequestException(error.message || 'AWS Biometric validation failed');
  }
}

}