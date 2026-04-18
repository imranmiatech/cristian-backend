import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq'; 
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AtStrategy } from './core/jwt/at.strategy';
import { RedisModule } from './common/redis/redis.module';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './lib/file/file.module';
import { SeederService } from './core/seed/seed.service';
import { EmailModule } from './lib/email/email.module';
import { CompanyModule } from './modules/company/company.module';
import { NoteModule } from './modules/note/note.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('redis.host') || 'redis_cache',
          port: config.get('redis.port') || 6379,
        },
      }),
    }),
    FileModule,
    ConfigurationModule,
    AuthModule,
    UserModule,
    PrismaModule,
    RedisModule,
    EmailModule,
    CompanyModule,
    NoteModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AtStrategy,
    SeederService
  ],
})
export class AppModule {}