import {
  Body, Controller, Post, Get, Patch, Delete, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, HttpStatus
} from "@nestjs/common";
import { ApiConsumes, ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/core/jwt/jwt-auth.guard";
import { RoleGuard } from "src/core/jwt/roles.guard";
import { Roles } from "src/core/jwt/roles.decorator";
import { GetUser } from "src/core/jwt/get-user.decorator";

import { DocumentService } from "../service/document.service";
import { CreateDocumentDto, UpdateDocumentDto } from "../dto/document.dto";
import { UserRole } from "prisma/generated/prisma/enums";
import { MulterService } from "src/lib/file/service/multer.service";
import { FileType } from "src/lib/file/utils/file-type.enum";

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, RoleGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) { }

  @Post('create-document')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload a document for a company' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', new MulterService().singleUpload(FileType.any)))
  async upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.documentService.uploadForCompany(dto, file);
    return {
      message: 'Document uploaded and assigned successfully',
      data,
    };
  }

  @Get('company/:companyId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all documents for a specific company' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('page') page: number = 1
  ) {
    const result = await this.documentService.getCompanyDocuments(+page);
    return {
      statusCode: HttpStatus.OK,
      message: `Successfully retrieved documents for company`,
      ...result,
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update document display name' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto
  ) {
    const data = await this.documentService.updateMetadata(id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Document metadata updated successfully',
      data,
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Permanently delete a document from S3 and Database' })
  async remove(@Param('id') id: string) {
    const result = await this.documentService.removeDocument(id);
    return {
      statusCode: HttpStatus.OK,
      message: result.message || 'Document has been permanently deleted',
    };
  }
}