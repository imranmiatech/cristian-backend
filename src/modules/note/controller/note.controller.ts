import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/core/jwt/jwt-auth.guard";
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
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
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
        @GetUser('id') userId: string,
    ) {
        const result = await this.noteService.createNote(dto, files, userId);

        return {
            message: 'Note and documents created successfully',
            data: result,
        };
    }


    @Get('all')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Search all notes with advanced filters' })
    @ApiQuery({ name: 'companySearch', required: false, description: 'Search by company name or ID' })
    @ApiQuery({ name: 'authorId', required: false, description: 'Filter by author ID' })
    @ApiQuery({ name: 'type', required: false, description: 'Filter by note type' })
    @ApiQuery({ name: 'search', required: false, description: 'Search in title or content' })
    @ApiQuery({ name: 'tag', required: false, description: 'Filter by any tag (communication or service)' })
    @ApiQuery({ name: 'communicationTag', required: false, description: 'Filter by communication tag' })
    @ApiQuery({ name: 'serviceTag', required: false, description: 'Filter by service tag' })
    @ApiQuery({ name: 'startDate', required: false, example: '' })
    @ApiQuery({ name: 'endDate', required: false, example: '' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Query('companySearch') companySearch?: string,
        @Query('authorId') authorId?: string,
        @Query('type') type?: string,
        @Query('search') search?: string,
        @Query('tag') tag?: string,
        @Query('communicationTag') communicationTag?: string,
        @Query('serviceTag') serviceTag?: string,
        @Query('startDate') createdAt?: string,
        @Query('endDate') updatedAt?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return await this.noteService.getAllNotes({
            companySearch,
            authorId,
            type,
            search,
            tag,
            communicationTag,
            serviceTag,
            createdAt,
            updatedAt,
            page: +page,
            limit: +limit,
        });
    }

    @Get('audit/all')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get system-wide audit logs for all notes' })
    @ApiQuery({ name: 'noteName', required: false, description: 'Filter by note title' })
    @ApiQuery({ name: 'authorName', required: false, description: 'Filter by name of person who made the change' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date range' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date range' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getAllHistory(
        @Query('noteName') noteName?: string,
        @Query('authorName') authorName?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return await this.noteService.getAllHistory({
            noteName,
            authorName,
            startDate,
            endDate,
            page: +page,
            limit: +limit,
        });
    }

    @Patch(':id/pin')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Toggle pin status of a note' })
    async togglePin(@Param('id') id: string) {
        return await this.noteService.togglePin(id);
    }
    @Get('pinned')
    @ApiOperation({ summary: 'Get all pinned notes' })
    @ApiQuery({ name: 'companyId', required: false })
    async getPinned(@Query('companyId') companyId?: string) {
        const data = await this.noteService.getPinnedNotes(companyId);
        return {
            message: 'Pinned notes retrieved successfully',
            data,
        };
    }


    @Get('company/:companyId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
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

    @Get(':id/history')
    @ApiOperation({ summary: 'Get the full audit log/history of a note' })
    async getHistory(@Param('id') id: string) {
        const history = await this.noteService.getNoteHistory(id);
        return {
            message: 'Note history retrieved successfully',
            data: history,
        };
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update a note, manage files, and log changes to history' })
    @UseInterceptors(FilesInterceptor('files', 10, new MulterService().multipleUpload(10, FileType.any)))
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateNoteDto,
        @UploadedFiles() files: Express.Multer.File[],
        @GetUser('id') userId: string // Extract the ID of the person making the change
    ) {
        const result = await this.noteService.updateNote(id, dto, files, userId);

        return {
            message: 'Note updated successfully and change logged to history',
            data: result,
        };
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get a single note details by its ID' })
    async getOne(@Param('id') id: string) {
        const data = await this.noteService.getNoteById(id);
        return {
            message: 'Note details retrieved successfully',
            data,
        };
    }

    @Patch(':id/soft-delete')
    @ApiOperation({ summary: 'Move a note to trash (Soft Delete)' })
    async softDelete(@Param('id') id: string, @GetUser('id') userId: string) {
        return await this.noteService.softDeleteNote(id, userId);
    }

    @Patch(':id/recover')
    @ApiOperation({ summary: 'Restore a note from trash' })
    async recover(@Param('id') id: string, @GetUser('id') userId: string) {
        return await this.noteService.recoverNote(id, userId);
    }

    @Delete(':id/hard-delete')
    @ApiOperation({ summary: 'Delete a note and files permanently' })
    async hardDelete(@Param('id') id: string) {
        return await this.noteService.hardDeleteNote(id);
    }


}
