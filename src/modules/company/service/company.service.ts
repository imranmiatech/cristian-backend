import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCompanyDto } from '../dto/company.dto';
import { CompanyStatus } from 'prisma/generated/prisma/enums';
import { UpdateCompanyDto } from '../dto/update.company.dto';


@Injectable()
export class CompanyService {
    constructor(private readonly prisma: PrismaService) { }

    async createCompany(
        dto: CreateCompanyDto,
        files: { logo?: Express.Multer.File[], documents?: Express.Multer.File[] },
        userId: string
    ) {
        const {
            noteTitle,
            noteContent,
            interactionTypes,
            services,
            tags,
            assignUsername,
            documents,
            logo,
            ...companyData
        } = dto;

        if (interactionTypes?.length) {
            const count = await this.prisma.interactionType.count({ where: { id: { in: interactionTypes } } });
            if (count !== interactionTypes.length) throw new NotFoundException('One or more Interaction Types not found');
        }

        if (services?.length) {
            const count = await this.prisma.service.count({ where: { id: { in: services } } });
            if (count !== services.length) throw new NotFoundException('One or more Services not found');
        }

        const logoFile = files?.logo?.[0];
        const logoPath = logoFile ? `/uploads/${logoFile.filename}` : null;

        const noteAttachments = files?.documents?.map(file => ({
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size,
        })) || [];

        try {
            return await this.prisma.company.create({
                data: {
                    ...companyData,
                    logo: logoPath,
                    assignUsername: assignUsername || null,
                    tags: Array.isArray(tags) ? tags : [],
                    user: { connect: { id: userId } },
                    notes: (noteTitle || noteContent) ? {
                        create: {
                            title: noteTitle,
                            content: noteContent || '',
                            authorId: userId,
                            interactionTypes: {
                                connect: (interactionTypes || []).map(id => ({ id }))
                            },
                            services: {
                                connect: (services || []).map(id => ({ id }))
                            },
                            documents: noteAttachments.length > 0 ? {
                                create: noteAttachments
                            } : undefined
                        }
                    } : undefined
                },
                include: {
                    notes: {
                        where: { deletedAt: null },
                        include: {
                            documents: true,
                            interactionTypes: true,
                            services: true
                        }
                    },
                    user: { select: { id: true, name: true, email: true } }
                }
            });
        } catch (error: unknown) {
            throw new ConflictException('Company with this email or phone already exists')
        }
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
                        { tags: { has: search } },
                        {
                            notes: {
                                some: {
                                    deletedAt: null,
                                    OR: [
                                        { title: { contains: search, mode: 'insensitive' } },
                                        { content: { contains: search, mode: 'insensitive' } },
                                        { interactionTypes: { some: { name: { contains: search, mode: 'insensitive' } } } },
                                        { services: { some: { name: { contains: search, mode: 'insensitive' } } } }
                                    ]
                                }
                            }
                        }
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
                        where: { deletedAt: null },
                        take: 3,
                        orderBy: [
                            { isPinned: 'desc' },
                            { createdAt: 'desc' }
                        ],
                        include: {
                            documents: true,
                            // --- ADDED THIS SECTION ---
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    profile: true,
                                }
                            }
                        }
                    },
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
                notes: {
                    where: { deletedAt: null },
                    orderBy: [
                        { isPinned: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    include: {
                        documents: true,
                    },
                },
            },
        });

        if (!company) throw new NotFoundException(`Company with ID ${id} not found`);
        return company;
    }

    async updateCompany(id: string, dto: UpdateCompanyDto, file?: Express.Multer.File) {
        const { tags, ...updateData } = dto;

        const exists = await this.prisma.company.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Company not found');

        return await this.prisma.company.update({
            where: { id },
            data: {
                ...updateData,
                ...(file && { logo: `/uploads/${file.filename}` }),
                ...(tags && { tags: Array.isArray(tags) ? tags : [tags] }),
            },
        });
    }

    async updateStatus(id: string, status: CompanyStatus) {
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

    async getCompanyStats() {
        const [total, active] = await Promise.all([
            this.prisma.company.count(),
            this.prisma.company.count({
                where: { status: CompanyStatus.ACTIVE }
            }),
        ]);

        return {
            total: total || 0,
            active: active || 0,
            pending: (total - active) || 0
        };
    }

}
