import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from '../dto/user.update.dto';
import { UpdatePasswordDto } from '../dto/update.password.dto';
import { SecurityUtil } from 'src/modules/auth/utils/security.util';
import { EmailService } from 'src/lib/email/email.service';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';
import { UserRole, UserStatus } from 'prisma/generated/prisma/enums';
import { CreateAdminDto } from '../dto/CreateAdminDto';
import { UserQueryDto } from '../dto/user-query.dto';


@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
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
                ...(profilePath && { profile: profilePath }),
            },
            select: {
                id: true,
                name: true,
                profile: true,
                mobile: true,
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

    async createAdmin(requesterId: string, data: CreateAdminDto) {
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId }
        });

        if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only Super Admins can create Admin accounts');
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await SecurityUtil.hashData(data.password);
        const newAdmin = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                mobile: data.mobile,
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
            },
        });
        const { password, ...result } = newAdmin;
        return result;
    }



    async getAllUsers(query: UserQueryDto) {
        const { search, status, role } = query;

        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 10);
        const skip = (page - 1) * limit;
        const andFilters: any[] = [];

        if (status) andFilters.push({ status });
        if (role) andFilters.push({ role });

        if (search) {
            andFilters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            });
        }

        const where = andFilters.length > 0 ? { AND: andFilters } : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            users,
            meta: {
                total,
                page,
                limit,
                lastPage: total > 0 ? Math.ceil(total / limit) : 0,
            },
        };
    }

    async toggleUserStatus(userId: string, targetStatus: keyof typeof UserStatus) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new NotFoundException('User not found');
        if (user.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Super Admin status cannot be modified');
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { status: targetStatus },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            },
        });

        if (targetStatus === 'SUSPENDED') {
            await this.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        }

        return updatedUser;
    }
}

