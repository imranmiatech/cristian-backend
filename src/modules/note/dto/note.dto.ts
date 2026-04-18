import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsUUID, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateNoteDto {
  @ApiPropertyOptional({ example: 'Q1 Financial Review' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Discussed the budget allocation...',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isPinned?: boolean;

  @ApiPropertyOptional({ example: 'GENERAL' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ 
    type: [String], 
    format: 'uuid',
    example: ['550e8400-e29b-41d4-a716-446655440000'] 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(t => t !== '');
    return [];
  })
  interactionTypes?: string[];

  @ApiPropertyOptional({ 
    type: [String], 
    format: 'uuid',
    example: ['7c9e6679-7425-40de-944b-e07fc1f90ae7'] 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(t => t !== '');
    return [];
  })
  services?: string[];

  @ApiPropertyOptional({ 
    type: [String], 
    format: 'uuid',
    example: ['a3b07204-742d-4c8d-9372-91696207f23c'] 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(t => t !== '');
    return [];
  })
  tags?: string[];

  @ApiProperty({ example: 'uuid-of-company' })
  @IsUUID()
  @IsNotEmpty()
  companyId!: string; 

  @ApiPropertyOptional({ example: 'uuid-of-parent-note' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' } })
  @IsOptional()
  files?: any[];
}