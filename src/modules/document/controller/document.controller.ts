import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentService } from '../service/document.service';
import { CreateDocumentDto, CreateManyDocumentsDto } from '../dto/document.dto';
import { UpdateDocumentDto } from '../dto/updateDoc.dto';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { GetUser } from 'src/core/jwt/get-user.decorator';
import { RoleGuard } from 'src/core/jwt/roles.guard';
import { Roles } from 'src/core/jwt/roles.decorator';
import { UserRole } from 'prisma/generated/prisma/enums';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MulterService } from 'src/lib/file/service/multer.service';
import { S3Service } from 'src/lib/file/service/s3.service';
import { FileType } from 'src/lib/file/utils/file-type.enum';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CustomThrottlerGuard } from 'src/core/rateLimiting/custom-throttler.guard';

// @SkipThrottle()
@ApiTags('Documents')
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('document')
@UseGuards(CustomThrottlerGuard)
export class DocumentController {
    constructor(private readonly documentService: DocumentService, private readonly s3Service: S3Service) { }

    @Throttle({ docs: { limit: 20, ttl: 60000 } })
    @Post('create-multiple')
    @Roles(UserRole.USER)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create multiple documents' })
    @UseInterceptors(FilesInterceptor('documentPhoto', 20, new MulterService().multipleUpload(20, FileType.image)))
    async createMany(
        @Body() bulkDto: CreateManyDocumentsDto,
        @GetUser('id') userId: string,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        let allUploadedUrls: string[] = [];
        try {
            const results = await Promise.all(bulkDto.documents.map(async (doc, index) => {
                const docFiles = files.filter(f => f.fieldname === `documents[${index}][documentPhoto]`) || [];
                let photoUrls: string[] = [];
                if (docFiles.length > 0) {
                    photoUrls = await this.s3Service.uploadMultiple(docFiles, 'documents');
                    allUploadedUrls.push(...photoUrls);
                }
                return await this.documentService.createDocument(doc, userId, photoUrls);
            }));

            return {
                message: "Documents created successfully",
                data: results
            };
        } catch (error) {
            if (allUploadedUrls.length > 0) {
                await Promise.all(allUploadedUrls.map(url => this.s3Service.deleteFile(url)));
            }
            throw error;
        }
    }

    @Throttle({ docs: { limit: 20, ttl: 60000 } })
    @Post('create-document')
    @Roles(UserRole.USER)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create document with photos' })
    @UseInterceptors(FilesInterceptor('documentPhoto', 5, new MulterService().multipleUpload(5, FileType.image)))
    async create(
        @Body() dto: CreateDocumentDto,
        @GetUser('id') userId: string,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        let photoUrls: string[] = [];
        try {
            if (files && files.length > 0) {
                photoUrls = await this.s3Service.uploadMultiple(files, 'documents');
            }
            const result = await this.documentService.createDocument(dto, userId, photoUrls);
            return { message: "Document created successfully", data: result };
        } catch (error) {
            if (photoUrls.length > 0) {
                await Promise.all(photoUrls.map(url => this.s3Service.deleteFile(url)));
            }
            throw error;
        }
    }

    @Get("all")
    @Roles(UserRole.USER)
    @ApiOperation({ summary: 'Get current user documents' })
    async findAll(@GetUser('id') userId: string) {
        const result = await this.documentService.getAllDocuments(userId);
        return { message: "Your documents fetched successfully", data: result }
    }

    @Get(':id')
    @Roles(UserRole.USER)
    @ApiOperation({ summary: 'Get document by ID' })
    async findOne(@Param('id') id: string, @GetUser('id') userId: string) {
        const result = await this.documentService.getDocumentById(id, userId);
        return { message: "Document fetched successfully", data: result }
    }

    @Throttle({ docs: { limit: 20, ttl: 60000 } })
    @Patch(':id')
    @Roles(UserRole.USER)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update document photos' })
    @UseInterceptors(FilesInterceptor('documentPhoto', 5, new MulterService().multipleUpload(5, FileType.image)))
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateDocumentDto,
        @GetUser('id') userId: string,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        let photoUrls: string[] = [];
        try {
            if (files && files.length > 0) {
                photoUrls = await this.s3Service.uploadMultiple(files, 'documents');
            }
            const result = await this.documentService.updateDocument(id, dto, userId, photoUrls.length > 0 ? photoUrls : undefined);
            return { message: "Document updated successfully", data: result };
        } catch (error) {
            if (photoUrls.length > 0) {
                await Promise.all(photoUrls.map(url => this.s3Service.deleteFile(url)));
            }
            throw error;
        }
    }
    @Throttle({ docs: { limit: 20, ttl: 60000 } })
    @Delete(':id')
    @Roles(UserRole.USER)
    @ApiOperation({ summary: 'Delete document' })
    async remove(@Param('id') id: string, @GetUser('id') userId: string) {
        await this.documentService.deleteDocument(id, userId);
        return { message: "Document deleted successfully" }
    }
}