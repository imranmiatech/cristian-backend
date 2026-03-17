// import { Injectable, NotFoundException } from "@nestjs/common";
// import { PrismaService } from "src/prisma/prisma.service";

// @Injectable()
// export class NotificationService {
//   constructor(private readonly prisma: PrismaService) {}

//   async getAllNotification(userId: string) {
//     return await this.prisma.notificationRecipient.findMany({
//       where: {
//         userId: userId,
//         notification: { deletedAt: null },
//       },
//       include: { notification: true },
//       orderBy: { notification: { createdAt: 'desc' } },
//     });
//   }

// async markAsRead(userId: string, notificationId: string) {

//   const result = await this.prisma.notificationRecipient.updateMany({
//     where: {
//       userId: userId,
//       notificationId: notificationId,
//       isRead: false,
//     },
//     data: {
//       isRead: true,
//       readAt: new Date(),
//     },
//   });

//   if (result.count === 0) {
//     throw new NotFoundException('Notification not found or already read');
//   }

//   return result;
// }

//   async markAllAsRead(userId: string) {
//     return await this.prisma.notificationRecipient.updateMany({
//       where: {
//         userId: userId,
//         isRead: false,
//       },
//       data: {
//         isRead: true,
//         readAt: new Date(),
//       },
//     });
//   }

//   async softDelete(userId: string, notificationId: string) {
//     try {
//       return await this.prisma.notification.update({
//         where: { id: notificationId },
//         data: { deletedAt: new Date() },
//       });
//     } catch (error) {
//       throw new NotFoundException('Notification not found');
//     }
//   }

// async hardDelete(userId: string, notificationId: string) {
//   const recipient = await this.prisma.notificationRecipient.findFirst({
//     where: { userId, notificationId }
//   });

//   if (!recipient) {
//     throw new NotFoundException('Notification not found or access denied');
//   }

//   return await this.prisma.notification.delete({
//     where: { id: notificationId },
//   });
// }
// }