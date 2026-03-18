import {
    Controller, Get, Post, Body, Patch, Param, Query, UseGuards,
    Delete
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CompanyService } from '../service/company.service';
;
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { RoleGuard } from 'src/core/jwt/roles.guard';
import { Roles } from 'src/core/jwt/roles.decorator';
import { CompanyStatus, UserRole } from 'prisma/generated/prisma/enums';
import { CreateCompanyDto } from '../dto/company.dto';
import { UpdateCompanyDto } from '../dto/update.company.dto';


@ApiTags('Company Management')
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new company and assign admins' })
    async create(@Body() createCompanyDto: CreateCompanyDto) {
        const data = await this.companyService.createCompany(createCompanyDto);
        return {
            message: 'Company created successfully',
            data
        };
    }
    @Get('all')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Retrieve all companies with optional filters and pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, email or phone' })
    @ApiQuery({ name: 'status', required: false, enum: CompanyStatus })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: CompanyStatus,
    ) {
        const result = await this.companyService.getAllCompanies(page, limit, search, status);
        return{
            message :"Company get successfully",
            data:result
        }
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get detailed company information' })
    async findOne(@Param('id') id: string) {
        const data = await this.companyService.getCompanyById(id);
        return { data };
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update company details and admin assignments' })
    @ApiBody({ type: UpdateCompanyDto }) 
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateCompanyDto
    ) {
        const data = await this.companyService.updateCompany(id, updateDto);
        return {
            message: 'Company updated successfully',
            data
        };
    }

    @Patch(':id/status')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Change company status (ACTIVE/PENDING)' })
    async changeStatus(
        @Param('id') id: string,
        @Body('status') status: CompanyStatus
    ) {
        const data = await this.companyService.toggleStatus(id, status);
        return {
            message: `Company status changed to ${status}`,
            data
        };
    }

    @Delete('remove/:id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Permanently delete a company (Hard Delete) - Super Admin Only',
        description: 'This action is irreversible. It will remove the company from the database.'
    })
    async remove(@Param('id') id: string) {
        return await this.companyService.hardDeleteCompany(id);
    }
}