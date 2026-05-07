import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";

import {
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

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

@ApiTags("Notes")
@Controller("notes")
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class NoteController {
  constructor(
    private readonly noteService: NoteService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create note with attachments" })
  @UseInterceptors(
    FilesInterceptor(
      "files",
      10,
      new MulterService().multipleUpload(10, FileType.any)
    )
  )
  async createNote(
    @Body() dto: CreateNoteDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser("id") userId: string,
  ) {
    const data = await this.noteService.createNote(dto, files, userId);

    return {
      message: "Note created successfully",
      data,
    };
  }

  @Get("all")
  @ApiOperation({ summary: "Get all notes with filters" })
  @ApiQuery({ name: "companySearch", required: false, description: "Search by company ID or name" })
  @ApiQuery({ name: "authorId", required: false, description: "Filter by author ID" })
  @ApiQuery({ name: "authorName", required: false, description: "Search by author name" })
  @ApiQuery({ name: "type", required: false, description: "Filter by note type" })
  @ApiQuery({ name: "search", required: false, description: "Search in title, content, contact name, or company name" })
  @ApiQuery({ name: "contactName", required: false, description: "Filter by contact name" })
  @ApiQuery({ name: "services", required: false, description: "Filter by service names (comma separated)" })
  @ApiQuery({ name: "interactionTypes", required: false, description: "Filter by interaction type names (comma separated)" })
  @ApiQuery({ name: "startDate", required: false, description: "Filter from date (ISO string)" })
  @ApiQuery({ name: "endDate", required: false, description: "Filter to date (ISO string)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async findAll(@Query() query: any) {
    return this.noteService.getAllNotes(query);
  }

  @Get("deleted/note")
  @ApiOperation({ summary: "Get all soft deleted notes" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getDeleted(@Query() query: any) {
    return this.noteService.getDeletedNotes(query);
  }

  @Get("me/notes")
  async myNotes(
    @GetUser("id") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.noteService.getAllNotes({
      authorId: userId,
      page: +page,
      limit: +limit,
    });
  }

  @Get("me/activity")
  async myActivity(
    @GetUser("id") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.noteService.getUserActivity(userId, +page, +limit);
  }

  @Get("company/:companyId")
  async getByCompany(
    @Param("companyId") companyId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.noteService.getNotesByCompany(companyId, +page, +limit);
  }

  @Get("pinned")
  async pinned(@Query("companyId") companyId?: string) {
    return this.noteService.getPinnedNotes(companyId);
  }

  @Get("audit/all")
  @ApiOperation({ summary: "System audit logs" })
  async auditAll(@Query() query: any) {
    return this.noteService.getAllHistory(query);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.noteService.getNoteById(id);
  }

  @Get(":id/history")
  async history(@Param("id") id: string) {
    return this.noteService.getNoteHistory(id);
  }

  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FilesInterceptor(
      "files",
      10,
      new MulterService().multipleUpload(10, FileType.any)
    )
  )
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateNoteDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser("id") userId: string,
  ) {
    const data = await this.noteService.updateNote(id, dto, files, userId);

    return {
      message: "Note updated successfully",
      data,
    };
  }

  @Patch(":id/pin")
  async togglePin(@Param("id") id: string) {
    return this.noteService.togglePin(id);
  }

  @Patch(":id/soft-delete")
  async softDelete(
    @Param("id") id: string,
    @GetUser("id") userId: string,
  ) {
    return this.noteService.softDeleteNote(id, userId);
  }

  @Patch(":id/recover")
  async recover(
    @Param("id") id: string,
    @GetUser("id") userId: string,
  ) {
    return this.noteService.recoverNote(id, userId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete a note" })
  async delete(
    @Param("id") id: string,
    @GetUser("id") userId: string,
  ) {
    return this.noteService.softDeleteNote(id, userId);
  }

  @Delete(":id/hard-delete")
  @ApiOperation({ summary: "Permanently delete a note" })
  async hardDelete(@Param("id") id: string) {
    return this.noteService.hardDeleteNote(id);
  }
}