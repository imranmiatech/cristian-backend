import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';

import { IsArray, IsOptional, IsUUID, IsString } from 'class-validator';
import { CreateNoteDto } from './note.dto';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @ApiPropertyOptional({ 
    type: [String], 
    example: ['uuid-of-file-to-delete'],
    description: 'old file delete ' 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  deleteFileIds?: string[];
}