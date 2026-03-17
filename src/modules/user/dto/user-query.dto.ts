import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from 'prisma/generated/prisma/enums';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserQueryDto {
    @ApiPropertyOptional({ 
        description: 'Search by name, email, or mobile', 
        example: 'john' 
    })
    @IsOptional()
    @IsString()
    search?: string; 

    @ApiPropertyOptional({ 
        enum: UserStatus, 
        description: 'Filter by user status' 
    })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @ApiPropertyOptional({ 
        enum: UserRole, 
        description: 'Filter by user role' 
    })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ 
        description: 'Page number', 
        default: 1, 
        type: Number 
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ 
        description: 'Items per page', 
        default: 10, 
        type: Number 
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}