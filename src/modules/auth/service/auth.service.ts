import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from './token.service';
import { RedisService } from 'src/common/redis/services/redis.service';
import { SecurityUtil } from '../utils/security.util';
import { LoginDto } from '../dto/login.dto';
import { DeviceInfo } from '../utils/device-info.decorator';
import { UserStatus } from 'prisma/generated/prisma/enums';
import { Prisma, User } from 'prisma/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) { }


  async login(payload: LoginDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        refreshTokens: {
          where: { isRevoked: false },
          select: { id: true, jti: true, userAgent: true }
        }
      }
    });

    //  Initial security validation soft delete
    if (!user || user.deletedAt) throw new UnauthorizedException('Invalid credentials');

    //  Brute-force protection: Check if the account is currently locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));

      throw new ForbiddenException({
        message: `Account is temporarily locked. Please try again after ${remainingMinutes} minutes.`,
        error: 'ACCOUNT_LOCKED',
        retryAfter: remainingMinutes
      });
    }

    //  Check  status
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException(`Account is ${user.status}`);

    //  pass verification
    const isPasswordValid = await SecurityUtil.compareData(payload.password, user.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Browser session
    const existingDeviceSession = user.refreshTokens.find(
      (t) => t.userAgent === device.userAgent
    );

    // Session limit 
    const maxSessions = this.config.get<number>('auth.max_sessions') || 5;
    if (!existingDeviceSession && user.refreshTokens.length >= maxSessions) {
      throw new ForbiddenException({
        message: `Login limit reached (${maxSessions} devices). Please logout from other devices first.`,
        error: 'MAX_SESSIONS_REACHED',
        limit: maxSessions
      });
    }


    return this.prisma.$transaction(async (tx) => {
      if (existingDeviceSession) {
        await tx.refreshToken.delete({ where: { id: existingDeviceSession.id } });
        await this.redis.del(`active_session:${existingDeviceSession.jti}`);
      }

      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockUntil: null },
      });

      return this.issueTokens(user, device, tx);
    });
  }


  async refresh(refreshToken: string, device: DeviceInfo) {
    const payload = await this.tokenService.verifyRefresh(refreshToken);

    const isBlacklisted = await this.redis.exists(`bl:${payload.jti}`);
    if (isBlacklisted) throw new UnauthorizedException('Token revoked');

    const session = await this.prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
    if (!session || session.isRevoked) {
      await this.clearUserSessions(payload.sub);
      throw new UnauthorizedException('Compromised session detected. Please login again.');
    }


    const isValidHash = await SecurityUtil.compareData(refreshToken, session.tokenHash);
    if (!isValidHash) {
      await this.clearUserSessions(payload.sub);
      throw new UnauthorizedException('Token mismatch');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({ where: { id: session.id } });
      await this.redis.set(`bl:${payload.jti}`, '1', 60); 
      return this.issueTokens(user, device, tx);
    });
  }


  async logout(userId: string, jti: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { jti, userId } });
    await this.redis.del(`active_session:${jti}`);
    await this.redis.set(`bl:${jti}`, '1', 3600); 
  }


  async logoutAll(userId: string): Promise<void> {
    const sessions = await this.prisma.refreshToken.findMany({ where: { userId } });
    for (const session of sessions) {
      await this.redis.set(`bl:${session.jti}`, '1', 3600);
      await this.redis.del(`active_session:${session.jti}`);
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  //helpers 
  private async handleFailedLogin(userId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const maxAttempts = this.config.get<number>('auth.max_login_attempts') || 5;
    const lockMinutes = this.config.get<number>('auth.lock_time_minutes') || 12;

    let lockUntil: Date | null = null;

    if (attempts >= maxAttempts) {
      lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts, lockUntil: lockUntil },
    });

    if (attempts < maxAttempts) {
      const remaining = maxAttempts - attempts;
      throw new UnauthorizedException(`Invalid credentials. You have ${remaining} attempts left.`);
    } else {
      throw new ForbiddenException(`Account locked due to security policy. Retry after ${lockMinutes} minutes.`);
    }
  }


  private async issueTokens(user: User, device: DeviceInfo, tx: Prisma.TransactionClient) {
    const { accessToken, refreshToken, jti } = await this.tokenService.generateTokens({
      id: user.id, email: user.email, role: user.role,
    });

    const tokenHash = await SecurityUtil.hashData(refreshToken);
    const ttlDays = this.config.get<number>('jwt.refresh_ttl_days') || 7;
    const ttlSeconds = ttlDays * 24 * 60 * 60;

    await tx.refreshToken.create({
      data: {
        jti,
        tokenHash,
        userId: user.id,
        userAgent: device.userAgent,
        ipAddress: device.ip,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    await this.redis.set(`active_session:${jti}`, user.id, ttlSeconds);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private async clearUserSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({ where: { userId } });
    for (const session of sessions) {
      await this.redis.set(`bl:${session.jti}`, '1', 3600);
      await this.redis.del(`active_session:${session.jti}`);
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}