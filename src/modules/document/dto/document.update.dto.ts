import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { CreateNoteDto } from 'src/modules/note/dto/note.dto';


export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @ApiPropertyOptional({ 
    type: [String], 
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    description: 'IDs of the documents/files you want to remove from this note' 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  deleteFileIds?: string[];
}