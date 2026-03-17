import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';

import { PrismaModule } from './prisma/prisma.module';
import { DocumentModule } from './modules/document/document.module';
import { EmContactModule } from './modules/contact/contace.module';
import { AtStrategy } from './core/jwt/at.strategy';
import { RedisModule } from './common/redis/redis.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './lib/file/file.module';
import { SeederService } from './core/seed/seed.service';
import { EmailModule } from './lib/email/email.module';
import { ReplacePhoneModule } from './modules/replacephone/phone.module';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './core/rateLimiting/custom-throttler.guard';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_CONNECTION_URL || 'redis://localhost:6379',
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'auth',
          ttl: 60000,    //1m
          limit: 10,      
        },
        {
          name: 'user',
          ttl: 60000,    // 1m
          limit: 20,     
        },
        {
          name: 'contact',
          ttl: 60000,    // 1m
          limit: 30,     
        },
        {
          name: 'docs',
          ttl: 3600000, //1hr
          limit: 50,    
        },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis(process.env.REDIS_CONNECTION_URL || 'redis://localhost:6379')
      ),
    }),
    ScheduleModule.forRoot(),
    FileModule,
    ConfigurationModule,
    AuthModule,
    UserModule,
    PrismaModule,
    DocumentModule,
    EmContactModule,
    RedisModule,
    NotificationModule,
    ReplacePhoneModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AtStrategy,
    SeederService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  
  ],
})
export class AppModule {}