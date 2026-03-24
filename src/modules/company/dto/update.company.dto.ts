import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanyStatus } from 'prisma/generated/prisma/enums';


export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  PhoneNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  assignUsername?: string;

  @ApiPropertyOptional({ enum: CompanyStatus }) 
  @IsOptional() @IsEnum(CompanyStatus)
  status?: CompanyStatus;

 @ApiPropertyOptional({ type: [String], example: ['SaaS', 'Fintech'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim());
    return value;
  })
  tags?: string[];

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  logo?: any;
}