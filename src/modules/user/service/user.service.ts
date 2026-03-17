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
            include: {
                faceBiometric: true,
                emergencyContact: true,
                document: true,
            },
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

        await this.sendProfileUpdateNotification(userId);
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

    async sendEmailToContacts(userId: string, dto: SendEmailDto): Promise<SendEmailResponseDto> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');

        const contacts = await this.prisma.emContact.findMany({
            where: { id: { in: dto.contactIds }, userId },
        });

        if (!contacts.length) throw new NotFoundException('No valid contacts found');

        // Queue the emergency broadcast
        await this.emailService.queueEmergencyBroadcast({ userId, dto });

        // Send internal system notification immediately
        await this.sendEmergencyNotification(userId, dto.status, contacts.length);

        return { 
            message: 'Emergency broadcast initiated in the background', 
            results: contacts.map(c => ({ contactId: c.id, name: c.name, status: 'success' })) 
        };
    }

    private async sendEmergencyNotification(userId: string, status: SafetyStatus, count: number) {
        const isSafe = status === SafetyStatus.SAFE;
        const title = isSafe ? 'Safety Status Sent' : 'Emergency Alert Dispatched';
        const body = isSafe
            ? `We've notified ${count} contacts that you are safe.`
            : `URGENT: ${count} emergency contacts have been notified of your location.`;

        try {
            const notification = await this.prisma.notification.create({
                data: {
                    title,
                    body,
                    type: NotificationType.SYSTEM,
                    resourceType: NotificationResourceType.EMERGENCY_CONTACT,
                    actorType: 'SYSTEM',
                    metadata: { status, contactCount: count, timestamp: new Date().toISOString() },
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
            console.error(`[Emergency Notification Error]`, error);
        }
    }

    private async sendProfileUpdateNotification(userId: string) {
        const title = 'Profile Updated';
        const body = 'Your profile information has been successfully updated.';

        try {
            const notification = await this.prisma.notification.create({
                data: {
                    title,
                    body,
                    type: NotificationType.SYSTEM,
                    resourceType: NotificationResourceType.IDEATED_VERIFIED,
                    actorType: 'SYSTEM',
                    metadata: { action: 'profile_update', timestamp: new Date().toISOString() },
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
            console.error(`[Profile Update Notification Error]`, error);
        }
    }


   
  

}