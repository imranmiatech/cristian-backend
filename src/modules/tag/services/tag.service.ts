import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTagDto } from '../dto/tag.dto';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  // --- InteractionType Operations ---
  async createInteractionType(dto: CreateTagDto) {
    const exists = await this.prisma.interactionType.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`InteractionType with name "${dto.name}" already exists`);
    return this.prisma.interactionType.create({ data: { name: dto.name } });
  }

  async getAllInteractionTypes() {
    return this.prisma.interactionType.findMany({ orderBy: { name: 'asc' } });
  }

  async deleteInteractionType(id: string) {
    try {
      return await this.prisma.interactionType.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`InteractionType with ID "${id}" not found`);
    }
  }

  // --- Service Operations ---
  async createService(dto: CreateTagDto) {
    const exists = await this.prisma.service.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Service with name "${dto.name}" already exists`);
    return this.prisma.service.create({ data: { name: dto.name } });
  }

  async getAllServices() {
    return this.prisma.service.findMany({ orderBy: { name: 'asc' } });
  }

  async deleteService(id: string) {
    try {
      return await this.prisma.service.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Service with ID "${id}" not found`);
    }
  }

}
