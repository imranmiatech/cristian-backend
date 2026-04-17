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
        const { companyId, title, content, communicationTags, serviceTags, isPinned, type, parentId } = dto;
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
                    communicationTags: communicationTags || [],
                    serviceTags: serviceTags || [],
                    companyId,
                    authorId,
                    isPinned: isPinned || false,
                    type: type || 'GENERAL',
                    parentId: parentId || null,
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
            return tx.note.findUnique({
                where: { id: note.id },
                include: { documents: true, followUps: true, parent: true },
            });
        });
    }

    async getAllNotes(query: {
        companySearch?: string;
        authorId?: string;
        type?: string;
        search?: string;
        tag?: string;
        communicationTag?: string;
        serviceTag?: string;
        createdAt?: string;
        updatedAt?: string;
        page?: number;
        limit?: number;
        showDeletedOnly?: boolean;
    }) {
        const { companySearch, authorId, type, search, tag, communicationTag, serviceTag, createdAt, updatedAt, showDeletedOnly } = query;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;

        const where: any = {
            AND: [
                { deletedAt: showDeletedOnly ? { not: null } : null },
                companySearch ? {
                    company: {
                        OR: [
                            { id: companySearch },
                            { name: { contains: companySearch, mode: 'insensitive' } }
                        ]
                    }
                } : {},
                authorId ? { authorId } : {},
                type ? { type: { contains: type, mode: 'insensitive' } } : {},
                tag ? {
                    OR: [
                        { communicationTags: { has: tag } },
                        { serviceTags: { has: tag } }
                    ]
                } : {},
                communicationTag ? { communicationTags: { has: communicationTag } } : {},
                serviceTag ? { serviceTags: { has: serviceTag } } : {},
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
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    documents: true,
                    company: { select: { name: true } },
                    author: { select: { name: true, email: true, profile: true } },
                    followUps: true,
                    parent: { select: { title: true } }
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

    async getNotesByCompany(companyId: string, page: number = 1, limit: number = 10) {
        const skip = (Number(page) - 1) * Number(limit);

        const [notes, total] = await this.prisma.$transaction([
            this.prisma.note.findMany({
                where: {
                    companyId: companyId,
                    deletedAt: null,
                },
                skip,
                take: Number(limit),
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    documents: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profile: true
                        }
                    },
                    followUps: true,
                    parent: { select: { title: true } }
                },
            }),
            this.prisma.note.count({
                where: {
                    companyId: companyId,
                    deletedAt: null,
                }
            }),
        ]);

        return {
            notes,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                lastPage: Math.ceil(total / Number(limit)),
            },
        };
    }

    async updateNote(noteId: string, dto: UpdateNoteDto, newUploadedFiles: Express.Multer.File[], currentUserId: string) {
        const { deleteFileIds, communicationTags, serviceTags, ...updateData } = dto;

        const existingNote = await this.prisma.note.findUnique({
            where: { id: noteId },
            include: { documents: true }
        });

        if (!existingNote) throw new NotFoundException(`Note not found`);

        return await this.prisma.$transaction(async (tx) => {
            // SNAPSHOT: Capture EVERYTHING before update
            await tx.noteHistory.create({
                data: {
                    noteId: existingNote.id,
                    oldTitle: existingNote.title,
                    oldContent: existingNote.content,
                    oldCommunicationTags: existingNote.communicationTags,
                    oldServiceTags: existingNote.serviceTags,
                    oldDocuments: existingNote.documents as any, // Preserve attachment metadata
                    changedById: currentUserId,
                    action: 'UPDATE'
                }
            });

            // Handle file removal from the current note record
            if (deleteFileIds && deleteFileIds.length > 0) {
                // We ONLY delete the database relationship. 
                // We DO NOT physically unlink the files from disk here, 
                // because the history log still needs them to be "permanent records".
                await tx.attachment.deleteMany({
                    where: { id: { in: deleteFileIds } }
                });
            }

            const attachmentData: AttachmentCreateInput[] = (newUploadedFiles || []).map(file => ({
                fileName: file.originalname,
                fileUrl: `/uploads/${file.filename}`,
                fileType: file.mimetype,
                fileSize: file.size,
            }));

            const updatedNote = await tx.note.update({
                where: { id: noteId },
                data: {
                    ...updateData,
                    communicationTags: communicationTags !== undefined ? communicationTags : existingNote.communicationTags,
                    serviceTags: serviceTags !== undefined ? serviceTags : existingNote.serviceTags,
                    documents: {
                        create: attachmentData
                    }
                },
                include: { documents: true, followUps: true, parent: true }
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

    async getAllNoteHistory () {
        const note = await this.prisma.noteHistory.findMany()
    }

    async getPinnedNotes(companyId?: string) {
        return await this.prisma.note.findMany({
            where: {
                isPinned: true,
                deletedAt: null,
                ...(companyId ? { companyId } : {}),
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                documents: true,
                author: {
                    select: { name: true, email: true, profile: true }
                },
                company: {
                    select: { name: true }
                },
                followUps: true,
                parent: { select: { title: true } }
            },
        });
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
                    oldCommunicationTags: note.communicationTags,
                    oldServiceTags: note.serviceTags,
                }
            });

            return await tx.note.update({
                where: { id: noteId },
                data: { deletedAt: new Date() }
            });
        });
    }

    async recoverNote(noteId: string, userId: string) {
        const note = await this.prisma.note.findUnique({ where: { id: noteId } });
        if (!note) throw new NotFoundException('Note not found');

        return await this.prisma.$transaction(async (tx) => {
            await tx.noteHistory.create({
                data: {
                    noteId,
                    changedById: userId,
                    action: 'RECOVER',
                    oldTitle: note.title,
                    oldContent: note.content,
                    oldCommunicationTags: note.communicationTags,
                    oldServiceTags: note.serviceTags,
                }
            });

            return await tx.note.update({
                where: { id: noteId },
                data: { deletedAt: null }
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
            if (note.documents && note.documents.length > 0) {
                for (const doc of note.documents) {
                    const filePath = path.join(process.cwd(), doc.fileUrl);
                    try {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error(`Hard delete cleanup error: ${filePath}`, err);
                    }
                }
            }

            return await tx.note.delete({
                where: { id: noteId },
            });
        });
    }

    async togglePin(noteId: string) {
        const note = await this.prisma.note.findUnique({ where: { id: noteId } });
        if (!note) throw new NotFoundException('Note not found');

        return await this.prisma.note.update({
            where: { id: noteId },
            data: { isPinned: !note.isPinned }
        });
    }

    async getNoteById(noteId: string) {
        const note = await this.prisma.note.findUnique({
            where: { id: noteId },
            include: {
                documents: true,
                author: { select: { id: true, name: true, email: true, profile: true } },
                company: { select: { id: true, name: true } },
                history: {
                    include: { changedBy: { select: { name: true, email: true, profile: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                followUps: {
                    include: {
                        author: { select: { name: true } }
                    }
                },
                parent: {
                    select: { id: true, title: true }
                }
            },
        });

        if (!note) throw new NotFoundException('Note not found');
        return note;
    }
}
