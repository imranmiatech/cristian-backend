import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { Roles } from 'src/core/jwt/roles.decorator';
import { UserRole } from 'prisma/generated/prisma/enums';
import { TagService } from '../services/tag.service';
import { CreateTagDto } from '../dto/tag.dto';

@ApiTags('Taxonomy (Tags/Services/Interactions)')
@Controller('tags')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  // --- InteractionTypes ---
  @Post('interaction-types')
  @ApiOperation({ summary: 'Create a new interaction type' })
  async createInteractionType(@Body() dto: CreateTagDto) {
    return this.tagService.createInteractionType(dto);
  }

  @Get('interaction-types')
  @ApiOperation({ summary: 'Get all interaction types' })
  async getAllInteractionTypes() {
    return this.tagService.getAllInteractionTypes();
  }

  @Delete('interaction-types/:id')
  @ApiOperation({ summary: 'Hard delete an interaction type' })
  async deleteInteractionType(@Param('id') id: string) {
    return this.tagService.deleteInteractionType(id);
  }

  // --- Services ---
  @Post('services')
  @ApiOperation({ summary: 'Create a new service' })
  async createService(@Body() dto: CreateTagDto) {
    return this.tagService.createService(dto);
  }

  @Get('services')
  @ApiOperation({ summary: 'Get all services' })
  async getAllServices() {
    return this.tagService.getAllServices();
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Hard delete a service' })
  async deleteService(@Param('id') id: string) {
    return this.tagService.deleteService(id);
  }

  // --- General Tags ---
  @Post('general')
  @ApiOperation({ summary: 'Create a new general tag' })
  async createTag(@Body() dto: CreateTagDto) {
    return this.tagService.createTag(dto);
  }

  @Get('general')
  @ApiOperation({ summary: 'Get all general tags' })
  async getAllTags() {
    return this.tagService.getAllTags();
  }

  @Delete('general/:id')
  @ApiOperation({ summary: 'Hard delete a general tag' })
  async deleteTag(@Param('id') id: string) {
    return this.tagService.deleteTag(id);
  }
}
