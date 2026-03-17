import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from '../dto/user.update.dto';
import { UpdatePasswordDto } from '../dto/update.password.dto';
import { SecurityUtil } from 'src/modules/auth/utils/security.util';
import { SafetyStatus, SendEmailDto, SendEmailResponseDto, EmailSendResult } from '../dto/send-email.dto';
import { EmailService } from 'src/lib/email/email.service';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';
import { NotificationResourceType, NotificationType, UserStatus } from 'prisma/generated/prisma/enums';

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly notificationGateway: NotificationGateway,
    ) { }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new NotFoundException('User not found');
        const { password, ...result } = user;
        return result;
    }

    async updateMe(userId: string, data: UpdateUserDto, profilePath?: string) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                mobile: data.mobile,
                language: data.language,
                ...(profilePath && { profile: profilePath }),
            },
            select: {
                id: true,
                name: true,
                profile: true,
                mobile: true,
                language: true,
            },
        });
        return updatedUser;
    }

    async updatePassword(userId: string, dto: UpdatePasswordDto, currentDeviceJti?: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');

        const isPasswordValid = await SecurityUtil.compareData(dto.currentPassword, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Current password is incorrect');

        const hashedPassword = await SecurityUtil.hashData(dto.newPassword);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        await this.prisma.refreshToken.deleteMany({
            where: {
                userId,
                ...(currentDeviceJti && { jti: { not: currentDeviceJti } }),
            },
        });

        return { message: 'Password updated successfully. All other devices logged out.' };
    }



   
  

}