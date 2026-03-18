import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { DocumentModule } from './modules/document/document.module';



@Module({
  imports: [
    ScheduleModule.forRoot(),
    FileModule,
    ConfigurationModule,
    AuthModule,
    UserModule,
    PrismaModule,
    RedisModule,
    EmailModule,
    CompanyModule,
    NoteModule,
    DocumentModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AtStrategy,
    SeederService
  ],
})
export class AppModule {}