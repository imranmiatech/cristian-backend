import { Module } from '@nestjs/common';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';
import { EmailModule } from 'src/lib/email/email.module';
import { UserAnalysisDashboard } from './service/userAnilisisDashboard.service';
import { AdminDashboardController } from './controller/user.anilisisDashboard.controller';

@Module({
  imports: [EmailModule],
  controllers: [UserController,AdminDashboardController],
  providers: [UserService, UserAnalysisDashboard]
})
export class UserModule { }
