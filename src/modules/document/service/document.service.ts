import { Injectable, NotFoundException } from "@nestjs/common";
import { S3Service } from "src/lib/file/service/s3.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateDocumentDto, UpdateDocumentDto } from "../dto/document.dto";
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
    ) { }

    // CREATE
async uploadForCompany(dto: CreateDocumentDto, file: Express.Multer.File) {
    const { companyId, displayFileName } = dto;

    return await this.prisma.document.create({
        data: {
            fileName: displayFileName || file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size,
            docId: companyId 
        },
    });
}

    // READ (List for Company)
    async getCompanyDocuments(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [documents] = await Promise.all([
            this.prisma.document.findMany({

                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return { documents, meta: { page, limit } };
    }

    async updateMetadata(id: string, dto: UpdateDocumentDto) {
        return await this.prisma.document.update({
            where: { id },
            data: dto,
        });
    }

async removeDocument(id: string) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        
        if (!doc) {
            throw new NotFoundException('Document not found');
        }

        const filePath = path.join(process.cwd(), doc.fileUrl);

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error(`Failed to delete physical file: ${filePath}`, err);
        }
        await this.prisma.document.delete({ 
            where: { id } 
        });

        return { 
            message: 'Document deleted successfully from local storage and database' 
        };
    }
}