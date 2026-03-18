import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateNoteDto } from "../dto/note.dto";
import { S3Service } from "src/lib/file/service/s3.service";
import { UpdateNoteDto } from "../dto/update-note.dto";

@Injectable()
export class NoteService {
    constructor(private readonly prisma: PrismaService, private readonly s3Service: S3Service) { }

    async createNote(authorId: string, dto: CreateNoteDto, fileData: { url: string; file: Express.Multer.File }[]) {
        const { companyId, title, content, tags } = dto;

        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company) throw new NotFoundException('Company not found');

        return await this.prisma.$transaction(async (tx) => {
            const note = await tx.note.create({
                data: {
                    title,
                    content,
                    tags: tags || [],
                    companyId,
                    authorId,
                },
            });

            if (fileData.length > 0) {
                await tx.document.createMany({
                    data: fileData.map((item) => ({
                        fileName: item.file.originalname,
                        fileUrl: item.url,
                        fileType: item.file.mimetype,
                        fileSize: item.file.size,
                        noteId: note.id,
                        companyId: companyId,
                    })),
                });
            }

            return tx.note.findUnique({
                where: { id: note.id },
                include: { documents: true, author: { select: { name: true, email: true } } },
            });
        });
    }

    async getAllNotes(query: {
        companyId?: string;
        search?: string;
        tag?: string;
        createdAt?: string;
        updatedAt?: string;
        page?: number;
        limit?: number;
    }) {
        const { companyId, search, tag, createdAt, updatedAt } = query;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;
        const where: any = {
            AND: [
                companyId ? { companyId } : {},
                tag ? { tags: { has: tag } } : {},
                search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { content: { contains: search, mode: 'insensitive' } },
                    ],
                } : {},
                createdAt || updatedAt ? {
                    createdAt: {
                        gte: createdAt ? new Date(createdAt) : undefined,
                        lte: updatedAt ? new Date(updatedAt) : undefined,
                    },
                } : {},
            ],
        };

        const [notes, total] = await Promise.all([
            this.prisma.note.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }, 
                include: {
                    documents: true,
                    author: { select: { name: true, profile: true } },
                    company: { select: { name: true } },
                },
            }),
            this.prisma.note.count({ where }),
        ]);

        return {
            notes,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit),
            },
        };
    }


    // --- UPDATE NOTE ---
    async updateNote(noteId: string, dto: UpdateNoteDto, newUploadedFiles: any[]) {
    const { deleteFileIds, companyId, ...updateData } = dto;
    const note = await this.prisma.note.findUnique({
        where: { id: noteId },
        include: { documents: true }
    });
    if (!note) throw new NotFoundException('Note not found');

    return await this.prisma.$transaction(async (tx) => {
        if (deleteFileIds && deleteFileIds.length > 0) {
            const filesToDestroy = note.documents.filter(doc => deleteFileIds.includes(doc.id));

            for (const file of filesToDestroy) {
                await this.s3Service.deleteFile(file.fileUrl);
            }

            await tx.document.deleteMany({
                where: { id: { in: deleteFileIds } }
            });
        }

        if (newUploadedFiles.length > 0) {
            await tx.document.createMany({
                data: newUploadedFiles.map(file => ({
                    fileName: file.file.originalname,
                    fileUrl: file.url,
                    fileType: file.file.mimetype,
                    fileSize: file.file.size,
                    noteId: noteId,
                    companyId: note.companyId,
                })),
            });
        }
        return tx.note.update({
            where: { id: noteId },
            data: { ...updateData },
            include: { documents: true }
        });
    });
}

    async deleteNote(noteId: string) {
    const note = await this.prisma.note.findUnique({
        where: { id: noteId },
        include: { documents: true }
    });

    if (!note) throw new NotFoundException('Note not found');
    for (const doc of note.documents) {
        await this.s3Service.deleteFile(doc.fileUrl);
    }
    await this.prisma.note.delete({ where: { id: noteId } });

    return { message: 'Note and all associated files deleted successfully' };
}

  async getNotesByCompany(companyId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
        this.prisma.note.findMany({
            where: { companyId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                documents: true,
                author: {
                    select: { id: true, name: true, profile: true },
                },
            },
        }),
        this.prisma.note.count({ where: { companyId } }),
    ]);

    return {
        notes,
        meta: {
            total,
            page,
            limit,
            lastPage: Math.ceil(total / limit),
        },
    };
}

  async getNoteById(noteId: string) {
    const note = await this.prisma.note.findUnique({
        where: { id: noteId },
        include: {
            documents: true,
            author: {
                select: { id: true, name: true, email: true, profile: true },
            },
            company: {
                select: { id: true, name: true },
            },
        },
    });

    if (!note) throw new NotFoundException('Note not found');
    return note;
}
}


