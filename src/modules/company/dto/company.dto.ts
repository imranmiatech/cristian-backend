import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CompanyStatus } from 'prisma/generated/prisma/enums';

export class CreateCompanyDto {
  @ApiProperty({ 
    example: 'Tech Solutions Ltd', 
    description: 'The legal name of the company' 
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    example: 'contact@techsolutions.com', 
    description: 'Official corporate email address' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: '+8801700000000', 
    description: 'Primary contact phone number' 
  })
  @IsString()
  @IsNotEmpty()
  PhoneNumber: string;

  @ApiPropertyOptional({ 
    example: 'https://s3.bucket/logo.png', 
    description: 'URL of the company logo hosted on S3 or similar storage' 
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['SaaS', 'Fintech', 'B2B'], 
    description: 'Array of tags for categorization' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    example: 'Strategic Partnership', 
    description: 'Short title for internal notes regarding this company' 
  })
  @IsOptional()
  @IsString()
  notTitle?: string;

  @ApiPropertyOptional({ 
    example: 'Key client for Q3 infrastructure project.', 
    description: 'Detailed internal comments or context about the company' 
  })
  @IsOptional()
  @IsString()
  noteComment?: string;

  @ApiPropertyOptional({ 
    enum: CompanyStatus, 
    default: CompanyStatus.ACTIVE,
    description: 'Current operational status of the company' 
  })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiProperty({ 
    type: [String], 
    example: ['550e8400-e29b-41d4-a716-446655440000'], 
    description: 'List of Admin User IDs to be assigned to this company' 
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  adminIds: string[];
}