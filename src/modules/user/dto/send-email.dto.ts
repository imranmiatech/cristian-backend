import { IsNotEmpty, IsString, IsArray, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SafetyStatus {
    SAFE = 'SAFE',
    DANGER = 'DANGER',
    OTHER = 'OTHER',
}

export class SendEmailDto {
    @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    contactIds: string[];

    @ApiProperty({ enum: SafetyStatus, example: SafetyStatus.DANGER })
    @IsEnum(SafetyStatus)
    @IsNotEmpty()
    status: SafetyStatus;

    @ApiProperty({ example: 'Personal Emergency Subject', required: false })
    @IsOptional()
    @IsString()
    subject?: string; // New Field

    @ApiProperty({ example: 'Please call my brother as well.', required: false })
    @IsOptional()
    @IsString()
    message?: string; // New Field

    @ApiProperty({ example: 23.8103, required: false })
    @IsOptional()
    @IsNumber()
    lat?: number;

    @ApiProperty({ example: 90.4125, required: false })
    @IsOptional()
    @IsNumber()
    lng?: number;

    @ApiProperty({ example: 'Dhaka, Bangladesh', required: false })
    @IsOptional()
    @IsString()
    address?: string;
}

export class EmailSendResult {
    contactId: string;
    name: string;
    status: 'success' | 'failed';
    reason?: string;
}

export class SendEmailResponseDto {
    message: string;
    results: EmailSendResult[];
}