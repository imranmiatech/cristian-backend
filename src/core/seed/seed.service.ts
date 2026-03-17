import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole, UserStatus } from 'prisma/generated/prisma/enums';
import { SecurityUtil } from 'src/modules/auth/utils/security.util';

@Injectable()
export class SeederService {
    private readonly logger = new Logger(SeederService.name);

    constructor(private readonly prisma: PrismaService) { }

    async seedAdmin() {
        const adminEmail = process.env.ADMIN_EMAIL ;
        const adminPassword = process.env.ADMIN_PASSWORD;

        const existingAdmin = await this.prisma.user.findUnique({
            where: { email: adminEmail },
        });

        if (existingAdmin) {
            this.logger.log('Admin already exists, skipping seeding.');
            console.log('admin already exits')
            return existingAdmin;
        }

        const hashedPassword = await SecurityUtil.hashData(adminPassword as any);

        const admin = await this.prisma.user.create({
            data: {
                email: adminEmail as string,
                name: 'SUPER ADMIN',
                password: hashedPassword,
                role: UserRole.SUPER_ADMIN,
                status: UserStatus.ACTIVE,
            },
        });

        this.logger.log(` SUPER ADMIN user created: ${adminEmail}`);
        console.log("admin", admin.name, "created")
        return admin;
    }
}
