import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { RoleGuard } from 'src/core/jwt/roles.guard';
import { Roles } from 'src/core/jwt/roles.decorator';
import { UserRole, UserStatus } from 'prisma/generated/prisma/enums';
import { UserAnalysisDashboard } from '../service/userAnilisisDashboard.service';

@ApiTags('Admin Dashboard & Analytics')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
    constructor(private readonly dashboardService: UserAnalysisDashboard) { }


    @Get('stats-comparison')
    @ApiOperation({ summary: 'Get week-over-week and month-over-month growth comparison' })
    async getAdvancedStats() {
        const data = await this.dashboardService.getAdvancedStats();
        return {
            success: true,
            message: 'Advanced growth stats retrieved successfully',
            data,
        };
    }

    @Get('registration-trend')
    @ApiOperation({ summary: 'Get registration data for charts (Last 6 months)' })
    async getChartData() {
        const data = await this.dashboardService.getRegistrationChartData();
        return {
            success: true,
            message: 'Chart data retrieved successfully',
            data,
        };
    }

    @Get('user-activity')
    @ApiOperation({ summary: 'Get list of users with their document and contact counts' })
    async getUserActivity() {
        const data = await this.dashboardService.getUserActivityReport();
        return {
            success: true,
            message: 'User activity report retrieved successfully',
            data,
        };
    }

    //----------------dashboard-------------------------------------->
    // @UseGuards(JwtAuthGuard, RoleGuard)
    // @Roles(UserRole.ADMIN)
    // @Get('all-users')
    // @ApiOperation({ summary: 'Get all users' })
    // async getAllUsers() {
    //     const users = await this.dashboardService.getAllUsers();
    //     return { message: 'All users retrieved', data: users };
    // }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.ADMIN)
    @Get('overview')
    @ApiOperation({ summary: 'Overview: total users, documents, contacts' })
    async getOverview() {
        const stats = await this.dashboardService.getOverviewStats();
        return { message: 'Overview stats', data: stats };
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.ADMIN)
    @Patch(':id/status')
    @ApiOperation({ summary: 'Admin: Update user status' })
    @ApiBody({ schema: { properties: { status: { type: 'string', example: 'ACTIVE' } } } })
    async updateStatus(
        @Param('id') userId: string,
        @Body('status') status: UserStatus,
    ) {
        const result = await this.dashboardService.updateUserStatus(userId, status);
        return {
            message: "User status updated successfully",
            data: result
        };
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.ADMIN)
    @Delete(':id')
    @ApiOperation({ summary: 'Admin: Delete user ' })
    async deleteUser(@Param('id') userId: string) {
        return await this.dashboardService.deleteUser(userId);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.ADMIN)
    @Get('notification-stats')
    @ApiOperation({ summary: 'Get detailed notification analytics and engagement' })
    async getNotificationStats() {
        const data = await this.dashboardService.getNotificationStats();
        return {
            success: true,
            message: 'Notification analytics retrieved successfully',
            data,
        };
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.ADMIN)
    @Get('recent-notifications')
    @ApiOperation({ summary: 'Get the 10 most recent notifications sent by the system' })
    async getRecentNotifications() {
        const data = await this.dashboardService.getRecentNotifications();
        return {
            success: true,
            message: 'Recent notifications retrieved successfully',
            data,
        };
    }


}