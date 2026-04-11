import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CompanyStatus } from 'prisma/generated/prisma/enums';

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


  @ApiPropertyOptional({ type: [String], example: ['SaaS', 'Fintech'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim());
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

  // @ApiPropertyOptional({ enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  // @IsOptional()
  // @IsEnum(CompanyStatus)
  // status?: CompanyStatus;

  // --- Initial Note Info ---
  @ApiPropertyOptional({ example: 'Onboarding Note' })
  @IsOptional()
  @IsString()
  noteTitle?: string;

  @ApiPropertyOptional({ example: 'Initial setup details' })
  @IsOptional()
  @IsString()
  noteContent?: string;


  @ApiPropertyOptional({ type: [String], example: ['Email', 'Phone Call'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim());
    return value;
  })
  communicationTags?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Consulting', 'Audit'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim());
    return value;
  })
  serviceTags?: string[];

  // --- File Uploads ---
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Note documents'
  })
  @IsOptional()
  documents?: any[];
}
