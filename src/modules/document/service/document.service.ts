import { Injectable, NotFoundException } from "@nestjs/common";
import { S3Service } from "src/lib/file/service/s3.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateDocumentDto, UpdateDocumentDto } from "../dto/document.dto";

@Injectable()
export class DocumentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
    ) { }

    // CREATE
    async uploadForCompany(authorId: string, dto: CreateDocumentDto, file: Express.Multer.File) {
        const fileUrl = await this.s3Service.uploadSingle(file, 'company-documents');

        return await this.prisma.document.create({
            data: {
                fileName: dto.displayFileName || file.originalname,
                fileUrl: fileUrl,
                fileType: file.mimetype,
                fileSize: file.size,
                companyId: dto.companyId,
                authorId: authorId,
            },
            include: { author: { select: { name: true } } },
        });
    }

    // READ (List for Company)
    async getCompanyDocuments(companyId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [documents, total] = await Promise.all([
            this.prisma.document.findMany({
                where: { companyId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { author: { select: { name: true, profile: true } } },
            }),
            this.prisma.document.count({ where: { companyId } }),
        ]);

        return { documents, meta: { total, page, limit } };
    }

    async updateMetadata(id: string, dto: UpdateDocumentDto) {
        return await this.prisma.document.update({
            where: { id },
            data: dto,
        });
    }

    async removeDocument(id: string) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException('Document not found');
        await this.s3Service.deleteFile(doc.fileUrl);
        await this.prisma.document.delete({ where: { id } });

        return { message: 'Document deleted successfully from storage and database' };
    }
}