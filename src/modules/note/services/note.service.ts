import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateNoteDto } from "../dto/note.dto";
import { S3Service } from "src/lib/file/service/s3.service";
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
    constructor(private readonly prisma: PrismaService, private readonly s3Service: S3Service) { }


    async createNote(dto: CreateNoteDto, files: Express.Multer.File[], authorId: string) {
        const { companyId, title, content, communicationTags, serviceTags, isPinned, type } = dto;
        const company = await this.prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) throw new NotFoundException('Company not found');

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
                include: { documents: true },
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
    }) {
        const { companySearch, authorId, type, search, tag, communicationTag, serviceTag, createdAt, updatedAt } = query;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;

        const where: any = {
            AND: [
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
                    author: { select: { name: true, email: true } }
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
// note.service.ts

async updateNote(noteId: string, dto: UpdateNoteDto, newUploadedFiles: Express.Multer.File[]) {
        const { deleteFileIds, communicationTags, serviceTags, ...updateData } = dto;

        const existingNote = await this.prisma.note.findUnique({
            where: { id: noteId },
            include: { documents: true }
        });

        if (!existingNote) {
            throw new NotFoundException(`Note with ID ${noteId} not found`);
        }

        return await this.prisma.$transaction(async (tx) => {
            const physicalFilesToDelete: string[] = [];

            if (deleteFileIds && deleteFileIds.length > 0) {
                const targets = existingNote.documents.filter(doc => deleteFileIds.includes(doc.id));
                
                targets.forEach(t => {
                    const filePath = path.join(process.cwd(), t.fileUrl);
                    physicalFilesToDelete.push(filePath);
                });

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
                include: { documents: true }
            });

            if (physicalFilesToDelete.length > 0) {
                for (const filePath of physicalFilesToDelete) {
                    if (fs.existsSync(filePath)) {
                        fs.unlink(filePath, (err) => {
                            if (err) console.error(`Cleanup error: ${filePath}`, err);
                        });
                    }
                }
            }

            return updatedNote;
        });
    }

    async togglePin(noteId: string) {
        const note = await this.prisma.note.findUnique({
            where: { id: noteId }
        });

        if (!note) throw new NotFoundException('Note not found');

        return await this.prisma.note.update({
            where: { id: noteId },
            data: { isPinned: !note.isPinned }
        });
    }


    async deleteNote(noteId: string) {
        const note = await this.prisma.note.findUnique({
            where: { id: noteId },
            include: { documents: true },
        });

        if (!note) {
            throw new NotFoundException('Note not found');
        }
        return await this.prisma.$transaction(async (tx) => {
            if (note.documents && note.documents.length > 0) {
                const documentIds = note.documents.map(doc => doc.id);

                for (const doc of note.documents) {
                    const relativePath = doc.fileUrl.replace(/^(?:https?:\/\/[^\/]+)/, '');
                    const filePath = path.join(process.cwd(), relativePath);

                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (err) { }
                }

                await tx.document.deleteMany({
                    where: {
                        id: { in: documentIds }
                    }
                });
            }

            return await tx.note.delete({
                where: { id: noteId },
            });
        });
    }


    async getNotesByCompany(companyId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [notes, total] = await Promise.all([
            this.prisma.note.findMany({
                where: {
                    companyId: companyId
                },
                skip,
                take: limit,
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    documents: true,
                    author: { select: { name: true } }
                },
            }),
            this.prisma.note.count({
                where: {
                    companyId: companyId
                }
            }),
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
                author: { select: { name: true, email: true } },
                company: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!note) throw new NotFoundException('Note not found');
        return note;
    }
}
