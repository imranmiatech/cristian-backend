import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationGateway } from "src/modules/notification/gateway/notification.gateway";
import { NotificationResourceType, NotificationType } from "prisma/generated/prisma/enums";

@Injectable()
export class MobileService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationGateway: NotificationGateway,
    ) {}

    async replacePhone(userId: string, newPhone: string) {
        await this.sendMobileNotification(userId, newPhone);

        return { success: true, message: 'Phone replaced and notification sent.' };
    }

    private async sendMobileNotification(userId: string, newPhone: string) {
        const title = 'Phone Replaced Successfully';
        const body = `Congratulation Your Phone Replaced Successfully.`;

        try {
            // Save to Database
            const notification = await this.prisma.notification.create({
                data: {
                    title,
                    body,
                    type: NotificationType.SYSTEM,
                    resourceType: NotificationResourceType.PHONE_REPLACEMENT, 
                    actorType: 'SYSTEM',
                    metadata: { newPhone, action: 'replace_phone', timestamp: new Date().toISOString() },
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
            console.error(`[Mobile Notification Error]`, error);
        }
    }
}