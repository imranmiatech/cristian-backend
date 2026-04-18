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

        const { noteTitle, noteContent, interactionTypes, services, noteTags, documents, logo, ...companyData } = dto;
        const logoFile = files?.logo?.[0];
        const logoPath = logoFile ? `/uploads/${logoFile.filename}` : null;


        const noteAttachments = files?.documents?.map(file => ({
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size,
        })) || [];

        return await this.prisma.company.create({
            data: {
                ...companyData,
                logo: logoPath,
                tags: Array.isArray(dto.tags) ? dto.tags : [],
                user: { connect: { id: userId } },

                notes: (noteTitle || noteContent) ? {
                    create: {
                        title: noteTitle,
                        content: noteContent || '',
                        interactionTypes: {
                            connectOrCreate: (interactionTypes || []).map(name => ({
                                where: { name },
                                create: { name }
                            }))
                        },
                        services: {
                            connectOrCreate: (services || []).map(name => ({
                                where: { name },
                                create: { name }
                            }))
                        },
                        tags: {
                            connectOrCreate: (noteTags || []).map(name => ({
                                where: { name },
                                create: { name }
                            }))
                        },
                        authorId: userId,
                        documents: noteAttachments.length > 0 ? {
                            create: noteAttachments
                        } : undefined
                    }
                } : undefined
            },
            include: {
                notes: { include: { documents: true, interactionTypes: true, services: true, tags: true } },
                user: { select: { name: true, email: true } }
            }
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
                        { tags: { has: search } },
                        {
                            notes: {
                                some: {
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
