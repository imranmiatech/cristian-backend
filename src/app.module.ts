import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AtStrategy } from './core/jwt/at.strategy';
import { RedisModule } from './common/redis/redis.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './lib/file/file.module';
import { SeederService } from './core/seed/seed.service';
import { EmailModule } from './lib/email/email.module';

import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './core/rateLimiting/custom-throttler.guard';

@Module({
  imports: [

    ScheduleModule.forRoot(),
    FileModule,
    ConfigurationModule,
    AuthModule,
    UserModule,
    PrismaModule,
    RedisModule,
    NotificationModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AtStrategy,
    SeederService
  ],
})
export class AppModule {}