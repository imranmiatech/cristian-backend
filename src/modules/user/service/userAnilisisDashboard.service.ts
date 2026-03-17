import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserStatus } from 'prisma/generated/prisma/enums';

@Injectable()
export class UserAnalysisDashboard {
    constructor(private readonly prisma: PrismaService) { }

    async getFullDashboardData() {
        const [overview, advancedStats, notifications, chartData] = await Promise.all([
            this.getOverviewStats(),
            this.getAdvancedStats(),
            this.getNotificationStats(),
            this.getRegistrationChartData(),
        ]);

        return {
            overview,
            growthMetrics: advancedStats,
            notifications,
            registrationTrend: chartData,
            generatedAt: new Date(),
        };
    }

    async getOverviewStats() {
        const [totalUsers, totalDocuments, totalContacts, faceLoginEnabled] = await Promise.all([
            this.prisma.user.count({ where: { deletedAt: null } }),
            this.prisma.document.count(),
            this.prisma.emContact.count(),
            this.prisma.user.count({
                where: {
                    deletedAt: null,
                    faceBiometric: { isNot: null }
                }
            }),
        ]);

        return { totalUsers, totalDocuments, totalContacts, faceLoginEnabled };
    }

    async getAdvancedStats() {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const [userStats, docStats, contactStats] = await Promise.all([
            this.getComparisonData('user', thisMonth, lastMonthStart, lastMonthEnd),
            this.getComparisonData('document', thisMonth, lastMonthStart, lastMonthEnd),
            this.getComparisonData('emContact', thisMonth, lastMonthStart, lastMonthEnd),
        ]);

        return { users: userStats, documents: docStats, contacts: contactStats };
    }

    private async getComparisonData(model: string, currentStart: Date, prevStart: Date, prevEnd: Date) {
        const db = this.prisma[model] as any;
        const [currentCount, prevCount, total] = await Promise.all([
            db.count({ where: { createdAt: { gte: currentStart } } }),
            db.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
            db.count()
        ]);

        const growth = prevCount === 0 ? (currentCount > 0 ? 100 : 0) :
            parseFloat(((currentCount - prevCount) / prevCount * 100).toFixed(2));

        return { total, thisMonth: currentCount, lastMonth: prevCount, growth: `${growth}%` };
    }

    async getNotificationStats() {
        const now = new Date();
        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [total, thisMonth, typeGroup, totalSent, readCount, globalGroup] = await Promise.all([
            this.prisma.notification.count(),
            this.prisma.notification.count({ where: { createdAt: { gte: firstDayMonth } } }),
            this.prisma.notification.groupBy({ by: ['type'], _count: { _all: true } }),
            this.prisma.notificationRecipient.count(),
            this.prisma.notificationRecipient.count({ where: { isRead: true } }),
            this.prisma.notification.groupBy({ by: ['isGlobal'], _count: { _all: true } })
        ]);

        const globalCount = globalGroup.find(g => g.isGlobal === true)?._count._all ?? 0;
        const targetedCount = globalGroup.find(g => g.isGlobal === false)?._count._all ?? 0;

        return {
            total,
            thisMonth,
            globalCount,
            targetedCount,
            readRate: totalSent > 0 ? `${((readCount / totalSent) * 100).toFixed(2)}%` : "0%",
            breakdown: typeGroup.map(t => ({ type: t.type, count: t._count._all }))
        };
    }

    async getUserActivityReport() {
        const users = await this.prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                status: true,
                profile: true,
                createdAt: true,
                _count: {
                    select: {
                        document: true,
                        emergencyContact: true,
                    }
                },
                refreshTokens: {
                    where: { isRevoked: false },
                    orderBy: { lastUsedAt: 'desc' },
                    take: 1,
                    select: {
                        ipAddress: true,
                        userAgent: true,
                        deviceId: true,
                        lastUsedAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return users.map(user => {
            const lastSession = user.refreshTokens[0] || null;
            const lastActiveDate = lastSession?.lastUsedAt || null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                status: user.status,
                profile: user.profile,
                joinedAt: user.createdAt,
                documentsCount: user._count.document,
                contactsCount: user._count.emergencyContact,
                lastActiveIp: lastSession?.ipAddress || 'N/A',
                lastUserAgent: lastSession?.userAgent || 'N/A',
                lastDeviceId: lastSession?.deviceId || 'N/A',
                lastLoginAt: lastActiveDate,
                lastActiveAgo: lastActiveDate ? this.formatTimeAgo(lastActiveDate) : 'Never',
                isOnline: lastActiveDate ? this.isUserOnline(lastActiveDate) : false
            };
        });
    }

    private isUserOnline(lastActivity: Date): boolean {
        const bufferTime = 5 * 60 * 1000;
        return (new Date().getTime() - lastActivity.getTime()) < bufferTime;
    }

    private formatTimeAgo(date: Date): string {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    async getRegistrationChartData() {
        const stats: any[] = await this.prisma.$queryRaw`
            SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(id) as count
            FROM "User"
            WHERE "createdAt" > NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
            ORDER BY DATE_TRUNC('month', "createdAt") ASC
        `;
        return stats.map(s => ({ month: s.month, count: Number(s.count) }));
    }

    async updateUserStatus(userId: string, status: UserStatus) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { status },
            select: { id: true, name: true, status: true }
        });
    }

    async deleteUser(userId: string) {
        await this.prisma.user.delete({ where: { id: userId } });
        return { success: true };
    }

    async getRecentNotifications() {
        const notifications = await this.prisma.notification.findMany({
            take: 10,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                title: true,
                body: true,
                type: true,
                isGlobal: true,
                createdAt: true,
                _count: {
                    select: { recipients: true }
                }
            }
        });

        return notifications.map(notification => ({
            id: notification.id,
            title: notification.title,
            body: notification.body,
            type: notification.type,
            isGlobal: notification.isGlobal,
            sentAt: notification.createdAt,
            recipientCount: notification._count.recipients
        }));
    }
}