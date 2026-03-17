import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmContactService } from '../service/contact.service';
import { CreateEmContactDto, UpdateEmContactDto } from '../dto/emContact.dto';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';

import { GetUser } from 'src/core/jwt/get-user.decorator';
import { UserRole } from 'prisma/generated/prisma/enums';
import { RoleGuard } from 'src/core/jwt/roles.guard';
import { Roles } from 'src/core/jwt/roles.decorator';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CustomThrottlerGuard } from 'src/core/rateLimiting/custom-throttler.guard';

// @SkipThrottle()
@ApiTags('Emergency Contacts')
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('emergency-contact')
@UseGuards(CustomThrottlerGuard)

export class EmContactController {
  constructor(private readonly emContactService: EmContactService) { }

  @Throttle({ contact: { limit: 20, ttl: 60000 } })
  @Post()
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Add emergency contact' })
  async create(@Body() dto: CreateEmContactDto, @GetUser('id') userId: string) {
    const result = await this.emContactService.create(dto, userId);
    return { message: "Contact added successfully", data: result };
  }

  @Throttle({ contact: { limit: 30, ttl: 60000 } })
  @Get()
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Get all contacts' })
  async findAll(@GetUser('id') userId: string) {
    const result = await this.emContactService.findAll(userId);
    return { message: "All contacts fetched", data: result };
  }
  
  @Throttle({ contact: { limit: 20, ttl: 60000 } })
  @Get(':id')
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Get contact by ID' })
  async findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    const result = await this.emContactService.findOne(id, userId);
    return { message: "Contact details fetched", data: result };
  }

  @Throttle({ contact: { limit: 20, ttl: 60000 } })
  @Patch(':id')
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Update contact' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmContactDto,
    @GetUser('id') userId: string
  ) {
    const result = await this.emContactService.update(id, dto, userId);
    return { message: "Contact updated successfully", data: result };
  }

  @Throttle({ contact: { limit: 20, ttl: 60000 } })
  @Delete(':id')
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Delete contact' })
  async remove(@Param('id') id: string, @GetUser('id') userId: string) {
    await this.emContactService.remove(id, userId);
    return { message: "Contact deleted successfully" };
  }
}