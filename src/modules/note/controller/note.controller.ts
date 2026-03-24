import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/core/jwt/jwt-auth.guard";
import { RoleGuard } from "src/core/jwt/roles.guard";
import { NoteService } from "../services/note.service";
import { S3Service } from "src/lib/file/service/s3.service";
import { Roles } from "src/core/jwt/roles.decorator";
import { UserRole } from "prisma/generated/prisma/enums";
import { FilesInterceptor } from "@nestjs/platform-express";
import { GetUser } from "src/core/jwt/get-user.decorator";
import { CreateNoteDto } from "../dto/note.dto";
import { UpdateNoteDto } from "../dto/update-note.dto";
import { MulterService } from "src/lib/file/service/multer.service";
import { FileType } from "src/lib/file/utils/file-type.enum";

@ApiTags('Notes')
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NoteController {
    constructor(
        private readonly noteService: NoteService,
        private readonly s3Service: S3Service,
    ) { }
    @Post()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a note with files for a company' })
    @UseInterceptors(FilesInterceptor('files', 10, new MulterService().multipleUpload(10, FileType.any)))
    async createNote(
        @Body() dto: CreateNoteDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const result = await this.noteService.createNote(dto, files);

        return {
            message: 'Note and documents created successfully',
            data: result,
        };
    }


    @Get('all')
    @ApiOperation({ summary: 'Search all notes with advanced filters' })
    @ApiQuery({ name: 'companyId', required: false })
    @ApiQuery({ name: 'search', required: false, description: 'Search in title or content' })
    @ApiQuery({ name: 'tag', required: false, description: 'Filter by a specific tag' })
    @ApiQuery({ name: 'startDate', required: false, example: '' })
    @ApiQuery({ name: 'endDate', required: false, example: '' })
    async findAll(
        @Query('companyId') companyId?: string,
        @Query('search') search?: string,
        @Query('tag') tag?: string,
        @Query('startDate') createdAt?: string,
        @Query('endDate') updatedAt?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return await this.noteService.getAllNotes({
            companyId,
            search,
            tag,
            createdAt,
            updatedAt,
            page,
            limit,
        });
    }



    @Get('company/:companyId')
    @ApiOperation({ summary: 'Get all notes for a specific company' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getByCompany(
        @Param('companyId') companyId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        const data = await this.noteService.getNotesByCompany(companyId, +page, +limit);
        return {
            message: 'Notes retrieved successfully',
            ...data,
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single note details by its ID' })
    async getOne(@Param('id') id: string) {
        const data = await this.noteService.getNoteById(id);
        return {
            message: 'Note details retrieved successfully',
            data,
        };
    }

    @Patch(':id')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FilesInterceptor('files', 10, new MulterService().multipleUpload(10, FileType.any)))
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateNoteDto,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        return await this.noteService.updateNote(id, dto, files);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete a note and its files permanently' })
    async remove(@Param('id') id: string) {
        return await this.noteService.deleteNote(id);
    }

}
