import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyStatus } from 'prisma/generated/prisma/enums';

export class UpdateCompanyStatusDto {
    @ApiProperty({
        enum: CompanyStatus,
        example: CompanyStatus.ACTIVE,
        description: 'Company status (ACTIVE or PENDING)',
    })
    @IsEnum(CompanyStatus)
    status: CompanyStatus;
}