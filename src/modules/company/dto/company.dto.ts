import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCompanyDto {
  // --- Company Basic Info ---
  @ApiProperty({ example: 'Tech Solutions Ltd' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'contact@techsolutions.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '+8801700000000' })
  @IsString()
  @IsNotEmpty()
  PhoneNumber!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ type: [String], example: ['SaaS', 'Fintech'], description: 'Company categories/tags. These are stored as simple strings.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(v => v !== '');
    return value;
  })
  tags?: string[];

  @ApiPropertyOptional({ example: 'Jon doe' })
  @IsOptional()
  @IsString()
  assignUsername?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Company Logo' })
  @IsOptional()
  logo?: any;

  // --- Initial Note Info ---
  @ApiPropertyOptional({ example: 'Onboarding Note' })
  @IsOptional()
  @IsString()
  noteTitle?: string;

  @ApiPropertyOptional({ example: 'Initial setup details' })
  @IsOptional()
  @IsString()
  noteContent?: string;


  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Array of InteractionType IDs for the initial note.'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(v => v !== '');
    return value;
  })
  interactionTypes?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    example: ['7c9e6679-7425-40de-944b-e07fc1f90ae7'],
    description: 'Array of Service IDs for the initial note.'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(v => v !== '');
    return value;
  })
  services?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Initial note documents'
  })
  @IsOptional()
  documents?: any[];
}
