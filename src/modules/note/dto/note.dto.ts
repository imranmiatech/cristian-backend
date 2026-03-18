import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateNoteDto {
  @ApiPropertyOptional({ 
    example: 'Q1 Financial Review', 
    description: 'The title of the note' 
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ 
    example: 'Discussed the budget allocation for the next quarter.', 
    description: 'The main content or body of the note' 
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['Urgent', 'Finance'], 
    description: 'Array of tags or comma-separated strings' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((t: string) => t.trim()) : [];
  })
  tags?: string[];

  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000', 
    description: 'The UUID of the company this note belongs to' 
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ 
    type: 'array', 
    items: { type: 'string', format: 'binary' }, 
    description: 'Upload multiple Pictures or PDFs' 
  })
  @IsOptional()
  files?: any[];
}