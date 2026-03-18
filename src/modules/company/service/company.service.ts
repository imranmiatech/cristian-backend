import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCompanyDto } from '../dto/company.dto';
import { CompanyStatus, UserRole } from 'prisma/generated/prisma/enums';
import { UpdateCompanyDto } from '../dto/update.company.dto';


@Injectable()
export class CompanyService {
    constructor(private readonly prisma: PrismaService) { }

    async createCompany(dto: CreateCompanyDto) {
        const { adminIds, ...companyData } = dto;

        if (adminIds && adminIds.length > 0) {
            const admins = await this.prisma.user.findMany({
                where: { id: { in: adminIds }, role: UserRole.ADMIN },
            });

            if (admins.length !== adminIds.length) {
                throw new NotFoundException('One or more Admin IDs are invalid or not Admins');
            }
        }

        return await this.prisma.company.create({
            data: {
                ...companyData,
                assignedAdmins: adminIds?.length > 0 ? {
                    connect: adminIds.map((id) => ({ id })),
                } : undefined,
            },
            //   include: {
            //     _count: { select: { assignedAdmins: true } },
            //   },
        });
    }


    async getAllCompanies(page: number = 1, limit: number = 10, search?: string, status?: CompanyStatus) {
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            AND: [
                status ? { status } : {},
                search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { PhoneNumber: { contains: search } },
                    ],
                } : {},
            ],
        };

        const [companies, total] = await Promise.all([
            this.prisma.company.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    notes: {
                        take: 3,
                        include: {
                            documents: true,
                            author: { select: { name: true } }
                        }
                    }
                },
            }),
            this.prisma.company.count({ where }),
        ]);

        return {
            companies,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                lastPage: Math.ceil(total / Number(limit)),
            },
        };
    }

    async getCompanyById(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                assignedAdmins: {
                    select: { id: true, name: true, email: true, profile: true },
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: {
                            select: { id: true, name: true, profile: true },
                        },
                        documents: true,
                    },
                },
                document: true
            },
        });

        if (!company) throw new NotFoundException(`Company with ID ${id} not found`);
        return company;
    }


    async updateCompany(id: string, dto: UpdateCompanyDto) {
        const { adminIds, ...updateData } = dto;


        await this.getCompanyById(id);

        return await this.prisma.company.update({
            where: { id },
            data: {
                ...updateData,
                assignedAdmins: adminIds ? {
                    set: adminIds.map((adminId) => ({ id: adminId })),
                } : undefined,
            },
        });
    }

    async toggleStatus(id: string, status: CompanyStatus) {
        return await this.prisma.company.update({
            where: { id },
            data: { status },
        });
    }



    async hardDeleteCompany(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: { _count: true }
        });

        if (!company) {
            throw new NotFoundException(`Company with ID ${id} not found`);
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.note.deleteMany({
                    where: { companyId: id },
                });
                await tx.document.deleteMany({
                    where: { companyId: id },
                });
                const deletedCompany = await tx.company.delete({
                    where: { id },
                });

                return {
                    success: true,
                    message: 'Company and all associated notes and documents have been permanently deleted',
                    deletedCompanyId: deletedCompany.id
                };
            });
        } catch (error) {
            throw new ConflictException(
                'An error occurred while deleting the company and its associations. Please try again.',
            );
        }
    }
}