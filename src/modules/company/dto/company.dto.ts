import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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


  @ApiPropertyOptional({ type: [String], example: ['SaaS', 'Fintech'], description: 'Company categories/tags' })
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


  @ApiPropertyOptional({ type: [String], example: ['Email', 'Phone Call'], description: 'Initial note interaction types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(v => v !== '');
    return value;
  })
  interactionTypes?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Consulting', 'Audit'], description: 'Initial note services' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(v => v !== '');
    return value;
  })
  services?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Urgent'], description: 'Initial note tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(v => v !== '');
    return value;
  })
  noteTags?: string[];

  // --- File Uploads ---
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Initial note documents'
  })
  @IsOptional()
  documents?: any[];
}
