import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocumentDto {
    @ApiProperty({ example: 'Passport' })
    @IsString()
    @IsNotEmpty()
    label: string;

    @ApiProperty({ example: 'P1234567' })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiProperty({ example: 'Identity', required: false })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, required: false })
    @IsOptional()
    documentPhoto?: any;
}

export class CreateManyDocumentsDto {
    @ApiProperty({ type: [CreateDocumentDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDocumentDto)
    documents: CreateDocumentDto[];
}