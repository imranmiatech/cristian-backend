import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { CreateNoteDto } from './note.dto';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @Transform(({ value }) => {

    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim()).filter((id) => id !== '');
    }
    return value;
  })
  deleteFileIds?: string[];
}