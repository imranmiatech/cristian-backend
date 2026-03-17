import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

async authenticate(client: Socket) {
  try {
    const token = this.extractToken(client);
    if (!token) return null;

    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const payload = await this.jwtService.verifyAsync(token, { secret });

    // IMPORTANT: Your log showed the ID is in 'sub'
    const userId = payload.sub; 

    if (!userId) return null;

    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
  } catch (error) {
    this.logger.error(`JWT Verification Failed: ${error.message}`);
    return null;
  }
}

private extractToken(client: Socket): string | null {
  const cookieHeader = client.handshake.headers?.cookie;
  // console.log(cookieHeader)
  if (!cookieHeader) return null;

  // Manual split is safer for complex cookie strings
  const items = cookieHeader.split(';');
  const tokenItem = items.find(item => item.trim().startsWith('access_token='));
  return tokenItem ? tokenItem.split('=')[1] : null;
}
}