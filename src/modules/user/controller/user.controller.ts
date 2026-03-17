import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '../service/user.service';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { RoleGuard } from 'src/core/jwt/roles.guard';
import { GetUser } from 'src/core/jwt/get-user.decorator';
import { UpdateUserDto } from '../dto/user.update.dto';
import { S3Service } from 'src/lib/file/service/s3.service';
import { MulterService } from 'src/lib/file/service/multer.service';
import { FileType } from 'src/lib/file/utils/file-type.enum';
import { UpdatePasswordDto } from '../dto/update.password.dto';
import { Roles } from 'src/core/jwt/roles.decorator';
import { UserRole } from 'prisma/generated/prisma/enums';
import { CreateAdminDto } from '../dto/CreateAdminDto';
import { UserQueryDto } from '../dto/user-query.dto';



@ApiTags('User Information')
@Controller('user')
// @UseGuards(CustomThrottlerGuard)
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly s3Service: S3Service,
        private readonly multerService: MulterService
    ) { }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Get('me')
    async getMe(@GetUser('id') userId: string) {
        const result = await this.userService.getMe(userId);
        return {
            message: "User data retrieved successfully",
            data: result
        };
    }
    @Patch('update-me')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('profile', new MulterService().singleUpload(FileType.image)))
    async updateMe(
        @GetUser('id') userId: string,
        @Body() updateUserDto: UpdateUserDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        let profileUrl: string | undefined;

        try {
            if (file) {
                profileUrl = await this.s3Service.uploadSingle(file, 'profiles');
            }
            const result = await this.userService.updateMe(userId, updateUserDto, profileUrl);

            return {
                message: "Profile updated successfully",
                data: result
            };

        } catch (error) {
            if (profileUrl) {
                await this.s3Service.deleteFile(profileUrl);
            }
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch('update-password')
    @ApiOperation({ summary: 'Update user password & logout other devices' })
    @ApiBody({ type: UpdatePasswordDto })
    async updatePassword(
        @GetUser('id') userId: string,
        @GetUser('jti') jti: string,
        @Body() dto: UpdatePasswordDto
    ) {
        return await this.userService.updatePassword(userId, dto, jti);
    }

    @Post('create-admin')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new admin (Super Admin only)' })
    async createAdmin(
        @GetUser('id') userId: string,
        @Body() createAdminDto: CreateAdminDto
    ) {
        const result = await this.userService.createAdmin(userId, createAdminDto);
        return {
            message: "Admin account created successfully",
            data: result
        };
    }


    @Get('all')
    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all users with filters and pagination' })
    async getAllUsers(@Query() query: UserQueryDto) {
        const result = await this.userService.getAllUsers(query);
        return {
            message: "Users retrieved successfully",
            data: result.users,
            meta: result.meta
        };
    }


}

