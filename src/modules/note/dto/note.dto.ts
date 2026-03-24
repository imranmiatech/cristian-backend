import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateNoteDto {
  @ApiPropertyOptional({ example: 'Q1 Financial Review' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Discussed the budget allocation...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String], example: ['Urgent', 'Finance'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((t) => t.trim());
    return [];
  })
  tags?: string[];

  @ApiProperty({ example: 'uuid-of-company' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' } })
  @IsOptional()
  files?: any[];
}