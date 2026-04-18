import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateNoteDto {
  @ApiPropertyOptional({ example: 'Q1 Financial Review' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Discussed the budget allocation...',
    required: false
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
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

  @ApiPropertyOptional({ type: [String], example: ['Email', 'Phone Call'], description: 'Interaction types / Communication channels' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(t => t !== '');
    return [];
  })
  interactionTypes?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Consulting', 'Audit'], description: 'Services discussed' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(t => t !== '');
    return [];
  })
  services?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Urgent', 'Follow-up'], description: 'General tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
