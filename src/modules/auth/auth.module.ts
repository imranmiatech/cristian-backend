// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; 
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { TokenService } from './service/token.service';
import { RedisModule } from 'src/common/redis/redis.module';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}), 
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    TokenService, 
    JwtAuthGuard 
  ],
  exports: [
    AuthService, 
    TokenService, 
    JwtAuthGuard 
  ],
})
export class AuthModule {}