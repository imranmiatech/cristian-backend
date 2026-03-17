// import { Controller, Get, Patch, Delete, Param, UseGuards } from "@nestjs/common";
// import { NotificationService } from "../service/notification.service";

// import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
// import { GetUser } from "src/core/jwt/get-user.decorator";
// import { JwtAuthGuard } from "src/core/jwt/jwt-auth.guard";
// import { RoleGuard } from "src/core/jwt/roles.guard";
// import { SkipThrottle } from "@nestjs/throttler";
// @SkipThrottle()
// @ApiTags("Notification")
// @UseGuards(JwtAuthGuard,RoleGuard)
// @Controller('notification')
// export class NotificationController {
//     constructor(private readonly notificationService: NotificationService) { }

//     @Get('my-notification')
//     @ApiOperation({ summary: 'Retrieve all active notifications' })
//     @ApiResponse({ status: 200, description: 'Success' })
//     async getNotifications(@GetUser('id') userId: string) {
//         const result = await this.notificationService.getAllNotification(userId);
//         return {
//             success: true,
//             message: "Notifications retrieved successfully",
//             data: result,
//         };
//     }

//     @Patch('read-all')
//     @ApiOperation({ summary: 'Mark all notifications as read' })
//     async markAllAsRead(@GetUser('id') userId: string) {
//         const result = await this.notificationService.markAllAsRead(userId);
//         return {
//             success: true,
//             message: `Marked ${result.count} notifications as read`,
//             data: result,
//         };
//     }

//     @Patch('read/:id')
//     @ApiOperation({ summary: 'Mark a specific notification as read' })
//     @ApiParam({ name: 'id', type: 'string' })
//     async markAsRead(
//         @GetUser('userId') userId: string,
//         @Param('id') notificationId: string,
//     ) {
//         const result = await this.notificationService.markAsRead(userId, notificationId);
//         return {
//             success: true,
//             message: "Notification marked as read",
//             data: result,
//         };
//     }

//     @Delete('soft-delete/:id')
//     @ApiOperation({ summary: 'Soft delete notification' })
//     async softDelete(
//         @GetUser('id') userId: string,
//         @Param('id') notificationId: string
//     ) {
//         await this.notificationService.softDelete(userId, notificationId);
//         return {
//             success: true,
//             message: "Notification soft deleted",
//         };
//     }

//   @Delete('hard-delete/:id')
// async hardDelete(
//     @GetUser('id') userId: string, 
//     @Param('id') notificationId: string
// ) {
  
//     await this.notificationService.hardDelete(userId, notificationId); 
//     return {
//         success: true,
//         message: "Notification permanently deleted",
//     };
// }
// }