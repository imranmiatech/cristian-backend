import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateNoteDto } from "../dto/note.dto";
import { UpdateNoteDto } from "../dto/update-note.dto";
import * as fs from 'fs';
import * as path from 'path';

interface AttachmentCreateInput {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
}

@Injectable()
export class NoteService {
    constructor(private readonly prisma: PrismaService) { }

    async createNote(dto: CreateNoteDto, files: Express.Multer.File[], authorId: string) {
        const { companyId, title, content, contactName, isPinned, type, parentId, interactionTypes, services } = dto;

        const company = await this.prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) throw new NotFoundException('Company not found');

        if (parentId) {
            const parentNote = await this.prisma.note.findUnique({
                where: { id: parentId }
            });

            if (!parentNote) throw new NotFoundException('Parent note not found');
        }

        return await this.prisma.$transaction(async (tx) => {
            const note = await tx.note.create({
                data: {
                    title,
                    content,
                    contactName,
                    companyId,
                    authorId,
                    isPinned: isPinned ?? false,
                    type: type || 'GENERAL',
                    parentId: parentId || null,
                    interactionTypes: {
                        connect: (interactionTypes || []).map(id => ({ id }))
                    },
                    services: {
                        connect: (services || []).map(id => ({ id }))
                    }
                },
            });

            if (files && files.length > 0) {
                await tx.attachment.createMany({
                    data: files.map((file) => ({
                        fileName: file.originalname,
                        fileUrl: `/uploads/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                        noteId: note.id,
                    })),
                });
            }

            await tx.noteHistory.create({
                data: {
                    noteId: note.id,
                    changedById: authorId,
                    action: 'CREATE',
                    newTitle: title,
                    newContent: content,
                    newContactName: contactName,
                    newIsPinned: isPinned ?? false,
                    newType: type || 'GENERAL',
                    newServices: (services || []) as any,
                    newInteractionTypes: (interactionTypes || []) as any,
                }
            });

            return tx.note.findUnique({
                where: { id: note.id },
                include: {
                    documents: true,
                    followUps: true,
                    parent: true,
                    services: true,
                    interactionTypes: true
                },
            });
        });
    }

    async getAllNotes(query: any) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;

        const where: any = {
            AND: [
                { deletedAt: query.showDeletedOnly ? { not: null } : null },
                query.companySearch ? {
                    company: {
                        OR: [
                            { id: query.companySearch },
                            { name: { contains: query.companySearch, mode: 'insensitive' } }
                        ]
                    }
                } : {},
                query.authorId ? { authorId: query.authorId } : {},
                query.authorName ? {
                    author: {
                        name: { contains: query.authorName, mode: 'insensitive' }
                    }
                } : {},
                query.type ? { type: { contains: query.type, mode: 'insensitive' } } : {},
                query.contactName ? { contactName: { contains: query.contactName, mode: 'insensitive' } } : {},
                query.search ? {
                    OR: [
                        { title: { contains: query.search, mode: 'insensitive' } },
                        { content: { contains: query.search, mode: 'insensitive' } },
                        { contactName: { contains: query.search, mode: 'insensitive' } },
                        { company: { name: { contains: query.search, mode: 'insensitive' } } },
                    ],
                } : {},
                // Advanced relation filtering
                query.services ? {
                    services: {
                        some: {
                            name: { in: Array.isArray(query.services) ? query.services : query.services.split(',') }
                        }
                    }
                } : {},
                query.interactionTypes ? {
                    interactionTypes: {
                        some: {
                            name: { in: Array.isArray(query.interactionTypes) ? query.interactionTypes : query.interactionTypes.split(',') }
                        }
                    }
                } : {},
                // Date range filtering
                (query.startDate || query.endDate) ? {
                    createdAt: {
                        gte: query.startDate ? new Date(query.startDate) : undefined,
                        lte: query.endDate ? new Date(query.endDate) : undefined,
                    }
                } : {},
            ],
        };

        const [notes, total] = await Promise.all([
            this.prisma.note.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    documents: true,
                    company: { select: { name: true } },
                    author: { select: { id: true, name: true, email: true, profile: true } },
                    followUps: true,
                    parent: true,
                    services: true,
                    interactionTypes: true
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

    async getDeletedNotes(query: any) {
        return this.getAllNotes({ ...query, showDeletedOnly: true });
    }
async updateNote(noteId: string, dto: UpdateNoteDto, newUploadedFiles: Express.Multer.File[], currentUserId: string) {
    const { interactionTypes, services, deleteFileIds, files, ...restDto } = dto;

    const existingNote = await this.prisma.note.findFirst({
        where: { id: noteId, deletedAt: null },
        include: {
            documents: true,
            services: true,
            interactionTypes: true
        }
    });

    if (!existingNote) throw new NotFoundException('Note not found or has been deleted');

    if (interactionTypes?.length) {
        const count = await this.prisma.interactionType.count({ where: { id: { in: interactionTypes } } });
        if (count !== interactionTypes.length) throw new NotFoundException('Some Interaction Types were not found');
    }

    if (services?.length) {
        const count = await this.prisma.service.count({ where: { id: { in: services } } });
        if (count !== services.length) throw new NotFoundException('Some Services were not found');
    }
    return await this.prisma.$transaction(async (tx) => {
        if (deleteFileIds && deleteFileIds.length > 0) {
            const filesToDelete = existingNote.documents.filter(doc => deleteFileIds.includes(doc.id));
            for (const doc of filesToDelete) {
                const filePath = path.join(process.cwd(), doc.fileUrl);
                try {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch (err) {
                    console.error(`Failed to delete file: ${filePath}`, err);
                }
            }
            await tx.attachment.deleteMany({
                where: { id: { in: deleteFileIds } }
            });
        }

        const attachmentData = (newUploadedFiles || []).map(file => ({
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size,
        }));

        const updatedNote = await tx.note.update({
            where: { id: noteId },
            data: {
                ...restDto,
                interactionTypes: interactionTypes ? {
                    set: interactionTypes.map(id => ({ id })) 
                } : undefined,
                services: services ? {
                    set: services.map(id => ({ id }))
                } : undefined,
                documents: attachmentData.length > 0 ? {
                    create: attachmentData
                } : undefined
            },
            include: {
                documents: true,
                followUps: true,
                parent: true,
                services: true,
                interactionTypes: true
            }
        });

        await tx.noteHistory.create({
            data: {
                noteId: existingNote.id,
                changedById: currentUserId,
                action: 'UPDATE',
                oldTitle: existingNote.title,
                oldContent: existingNote.content,
                oldContactName: existingNote.contactName,
                oldServices: existingNote.services as any,
                oldInteractionTypes: existingNote.interactionTypes as any,
                oldDocuments: existingNote.documents as any,
                oldIsPinned: existingNote.isPinned,
                oldType: existingNote.type,

                newTitle: updatedNote.title,
                newContent: updatedNote.content,
                newContactName: updatedNote.contactName,
                newServices: updatedNote.services as any,
                newInteractionTypes: updatedNote.interactionTypes as any,
                newDocuments: updatedNote.documents as any,
                newIsPinned: updatedNote.isPinned,
                newType: updatedNote.type,
            }
        });

        return updatedNote;
    });
}

    async getNoteHistory(noteId: string) {
        const note = await this.prisma.note.findUnique({
            where: { id: noteId },
            include: {
                history: {
                    include: {
                        changedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profile: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!note) throw new NotFoundException('Note not found');
        return note.history;
    }

    async softDeleteNote(noteId: string, userId: string) {
        const note = await this.prisma.note.findUnique({ where: { id: noteId } });
        if (!note) throw new NotFoundException('Note not found');

        return await this.prisma.$transaction(async (tx) => {
            await tx.noteHistory.create({
                data: {
                    noteId,
                    changedById: userId,
                    action: 'SOFT_DELETE',
                    oldTitle: note.title,
                    oldContent: note.content,
                    oldContactName: note.contactName,
                    oldIsPinned: note.isPinned,
                    oldType: note.type,
                    newTitle: note.title,
                    newContent: note.content,
                    newContactName: note.contactName,
                    newIsPinned: note.isPinned,
                    newType: note.type,
                }
            });

            return tx.note.update({
                where: { id: noteId },
                data: { deletedAt: new Date() }
            });
        });
    }

    async recoverNote(noteId: string, userId: string) {
        const note = await this.prisma.note.findFirst({ where: { id: noteId, deletedAt: { not: null } } });
        if (!note) throw new NotFoundException('Note not found or is not deleted');

        return await this.prisma.$transaction(async (tx) => {
            await tx.noteHistory.create({
                data: {
                    noteId,
                    changedById: userId,
                    action: 'RECOVER',
                    oldTitle: note.title,
                    oldContent: note.content,
                    oldContactName: note.contactName,
                    oldIsPinned: note.isPinned,
                    oldType: note.type,
                    newTitle: note.title,
                    newContent: note.content,
                    newContactName: note.contactName,
                    newIsPinned: note.isPinned,
                    newType: note.type,
                }
            });

            return tx.note.update({
                where: { id: noteId },
                data: { deletedAt: null },
                include: {
                    documents: true,
                    followUps: true,
                    parent: true,
                    services: true,
                    interactionTypes: true
                }
            });
        });
    }

    async hardDeleteNote(noteId: string) {
        const note = await this.prisma.note.findUnique({
            where: { id: noteId },
            include: { documents: true },
        });

        if (!note) throw new NotFoundException('Note not found');

        return await this.prisma.$transaction(async (tx) => {
            if (note.documents?.length) {
                for (const doc of note.documents) {
                    const filePath = path.join(process.cwd(), doc.fileUrl);
                    try {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    } catch { }
                }
            }

            return tx.note.delete({
                where: { id: noteId },
            });
        });
    }

    async togglePin(noteId: string) {
        const note = await this.prisma.note.findFirst({ where: { id: noteId, deletedAt: null } });
        if (!note) throw new NotFoundException('Note not found or has been deleted');

        return this.prisma.note.update({
            where: { id: noteId },
            data: { isPinned: !note.isPinned }
        });
    }

    async getNoteById(noteId: string) {
        const note = await this.prisma.note.findFirst({
            where: { id: noteId, deletedAt: null },
            include: {
                documents: true,
                author: true,
                company: true,
                history: {
                    include: { changedBy: true },
                    orderBy: { createdAt: 'desc' }
                },
                followUps: true,
                parent: true,
                services: true,
                interactionTypes: true
            },
        });

        if (!note) throw new NotFoundException('Note not found or has been deleted');
        return note;
    }
    async getUserActivity(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const where = {
            OR: [
                { changedById: userId }, // Changes made BY the user
                { note: { authorId: userId } } // Changes made TO the user's notes
            ]
        };

        const [activity, total] = await Promise.all([
            this.prisma.noteHistory.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    note: {
                        select: {
                            id: true,
                            title: true,
                            company: { select: { name: true } }
                        }
                    },
                    changedBy: {
                        select: { name: true, profile: true }
                    }
                }
            }),
            this.prisma.noteHistory.count({ where })
        ]);

        return {
            activity,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit)
            }
        };
    }
    async getAllHistory(query: {
        noteName?: string;
        authorName?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        const { noteName, authorName, startDate, endDate } = query;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;

        const where: any = {
            AND: [
                noteName ? {
                    note: {
                        title: { contains: noteName, mode: 'insensitive' }
                    }
                } : {},
                authorName ? {
                    changedBy: {
                        name: { contains: authorName, mode: 'insensitive' }
                    }
                } : {},
                startDate || endDate ? {
                    createdAt: {
                        gte: startDate ? new Date(startDate) : undefined,
                        lte: endDate ? new Date(endDate) : undefined,
                    }
                } : {},
            ]
        };

        const [history, total] = await Promise.all([
            this.prisma.noteHistory.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    note: { select: { id: true, title: true } },
                    changedBy: { select: { id: true, name: true, email: true, profile: true } }
                }
            }),
            this.prisma.noteHistory.count({ where })
        ]);

        return {
            history,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit)
            }
        };
    }

    async getPinnedNotes(companyId?: string) {
        return this.prisma.note.findMany({
            where: {
                isPinned: true,
                companyId: companyId ? companyId : undefined,
                deletedAt: null
            },
            include: {
                documents: true,
                author: { select: { name: true, profile: true } },
                company: { select: { name: true } },
                services: true,
                interactionTypes: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getNotesByCompany(companyId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const where = {
            companyId,
            deletedAt: null,
        };

        const [notes, total] = await Promise.all([
            this.prisma.note.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    documents: true,
                    author: { select: { name: true, profile: true } },
                    services: true,
                    interactionTypes: true,
                    company: { select: { name: true } }
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
}