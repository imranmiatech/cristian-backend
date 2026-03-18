import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ example: 'Project Proposal' })
  @IsOptional()
  @IsString()
  displayFileName?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'The file to upload' })
  file: any;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Updated File Name' })
  @IsOptional()
  @IsString()
  fileName?: string;
}