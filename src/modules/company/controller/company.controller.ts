import {
    Controller, Get, Post, Body, Patch, Param, Query, UseGuards,
    Delete,
    UseInterceptors,
    UploadedFiles,
    UploadedFile
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { CompanyService } from '../service/company.service';
;
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { RoleGuard } from 'src/core/jwt/roles.guard';
import { Roles } from 'src/core/jwt/roles.decorator';
import { CompanyStatus, UserRole } from 'prisma/generated/prisma/enums';
import { CreateCompanyDto } from '../dto/company.dto';
import { UpdateCompanyDto } from '../dto/update.company.dto';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MulterService } from 'src/lib/file/service/multer.service';
import { FileType } from 'src/lib/file/utils/file-type.enum';
import { GetUser } from 'src/core/jwt/get-user.decorator';
import { UpdateCompanyStatusDto } from '../dto/status.dto';


@ApiTags('Company Management')
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }
    @Post("create-company")
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'logo', maxCount: 1 },
        { name: 'documents', maxCount: 10 },
    ], new MulterService().multipleUpload(11, FileType.any)))
    async create(
        @Body() dto: CreateCompanyDto,
        @GetUser('id') userId: string,
        @UploadedFiles() files: { logo?: Express.Multer.File[], documents?: Express.Multer.File[] }
    ) {
        const result = await this.companyService.createCompany(dto, files, userId);

        return {
            message: "Company created successfully",
            data: result
        }
    }

    @Get('stats')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    async getStats() {
        const stats = await this.companyService.getCompanyStats();
        return {
            message: "Stats retrieved successfully",
            data: stats
        };
    }



    @Get('all')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Retrieve all companies with optional filters and pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search by name, email, phone, tags, or note content'
    })
    @ApiQuery({ name: 'status', required: false, enum: CompanyStatus })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: CompanyStatus,
    ) {
        const result = await this.companyService.getAllCompanies(page, limit, search, status);
        return {
            message: "Companies retrieved successfully",
            data: result
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
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update core company details' })
    @UseInterceptors(FileInterceptor('logo', new MulterService().singleUpload(FileType.image)))
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateCompanyDto,
        @UploadedFile() file?: Express.Multer.File
    ) {
        const data = await this.companyService.updateCompany(id, updateDto, file);
        return {
            message: 'Company updated successfully',
            data
        };
    }

    @Patch(':id/status')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Set company status (ACTIVE/PENDING)' })
    async changeStatus(
        @Param('id') id: string,
        @Body() dto: UpdateCompanyStatusDto
    ) {
        const data = await this.companyService.updateStatus(id, dto.status);

        return {
            message: `Company status set to ${dto.status}`,
            data,
        };
    }

    @Delete('remove/:id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({
        summary: 'Permanently delete a company (Hard Delete) - Super Admin Only',
        description: 'This action is irreversible. It will remove the company from the database.'
    })
    async remove(@Param('id') id: string) {
        return await this.companyService.hardDeleteCompany(id);
    }


}

