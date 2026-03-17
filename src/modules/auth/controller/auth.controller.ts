import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from '../service/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from 'src/core/jwt/get-user.decorator';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { DeviceInfo, GetDeviceInfo } from '../utils/device-info.decorator';
import { Public } from 'src/core/jwt/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Roles } from 'src/core/jwt/roles.decorator';
import { UserRole } from 'prisma/generated/prisma/enums';
import { CustomThrottlerGuard } from 'src/core/rateLimiting/custom-throttler.guard';

@Controller('auth')
// @UseGuards(CustomThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

 @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.register(dto, device);
    this.setCookies(res, access_token, refresh_token);
    return { message: 'Account created successfully', access_token };
  }

 @Throttle({ user: { limit: 6, ttl: 60000 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.login(dto, device);
    this.setCookies(res, access_token, refresh_token);
    return { message: 'Login successful', access_token };
  }

  //-------refresh token
  @Throttle({ auth: { limit: 6, ttl: 60000 } })
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException('No refresh token provided');

    const { access_token, refresh_token } = await this.authService.refresh(token, device);
    this.setCookies(res, access_token, refresh_token);
    return { access_token };
  }

  // logout -----------
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetUser('id') userId: string,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId, device.userAgent);
    this.clearCookies(res);
    return { message: 'Logged out successfully' };
  }

  //logout all -------
  // @UseGuards(JwtAuthGuard)
  // @Post('logout-all')
  // @HttpCode(HttpStatus.OK)
  // async logoutAll(@GetUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
  //   await this.authService.logoutAll(userId);
  //   this.clearCookies(res);
  //   return { message: 'Logged out from all devices' };
  // }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@GetUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(userId);
    this.clearCookies(res);
    return { message: 'Logged out from all devices' };
  }

  //----- login with face -------
  // @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('login-face')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Only JPEG and PNG images are permitted.'), false);
      }
      cb(null, true);
    },
  }))
  async loginWithFace(
    @UploadedFile() file: Express.Multer.File,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!file) throw new BadRequestException('Biometric data payload is missing.');

    const result = await this.authService.loginWithFace(file.buffer, device);
    if (!result) {
      throw new InternalServerErrorException('Authentication service failed to generate a session.');
    }

    const { access_token, refresh_token } = result;
    this.setCookies(res, access_token, refresh_token);

    return {
      status: 'success',
      message: 'Securely authenticated via Face ID.',
      data: { access_token }
    };
  }

  //---- setup face for login
  // @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('setup-face')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Only JPEG and PNG images are permitted.'), false);
      }
      cb(null, true);
    },
  }))
  async setupFace(
    @GetUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Biometric enrollment requires an image.');

    await this.authService.setupFaceBiometric(userId, file.buffer);

    return {
      status: 'success',
      message: 'Biometric profile has been successfully encrypted and linked.'
    };
  }

  @Post('admin/reset-biometrics')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async reset() {
    return await this.authService.resetFaceCollection();
  }


  //prod mode 
  private setCookies(res: Response, access: string, refresh: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    };

    res.cookie('access_token', access, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refresh, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
  }


  //dev mode
  // private setCookies(res: Response, access: string, refresh: string) {
  //   const commonOptions = {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'none' as const,
  //     path: '/',
  //   };

  //   res.cookie('access_token', access, { ...commonOptions, maxAge: 15 * 60 * 1000 });
  //   res.cookie('refresh_token', refresh, { ...commonOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
  // }


  // prod mode
  // clear all Cookies
  private clearCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const commonOptions = {
      httpOnly: true,
      secure: true,
      sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    };
    res.clearCookie('access_token', commonOptions);
    res.clearCookie('refresh_token', commonOptions);
  }

  //dev mode
  // clear all Cookies
  // private clearCookies(res: Response) {
  //   const commonOptions = {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'lax' as 'lax',
  //     path: '/',
  //   };

  //   res.clearCookie('access_token', commonOptions);
  //   res.clearCookie('refresh_token', commonOptions);
  // }

  //-------------
  // @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('liveness-session')
  @HttpCode(HttpStatus.OK)
  async createSession() {
    return await this.authService.createLivenessSession();
  }

  // AuthController.ts
  @UseGuards(JwtAuthGuard)
  @Post('liveness-setup')
  @HttpCode(HttpStatus.CREATED)
  async setupFaceWithVideo(
    @GetUser('id') userId: string,
    @Body() body: { sessionId: string },
  ) {

    console.log('Received SessionId:', body.sessionId);

    if (!body.sessionId) {
      throw new BadRequestException('SessionId is missing in request body');
    }

    return await this.authService.setupFaceLive(userId, body.sessionId);
  }

  @Public()
  @Post('liveness-login')
  @HttpCode(HttpStatus.OK)
  async loginFace(
    @Body('sessionId') sessionId: string,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!sessionId) throw new BadRequestException('SessionId is required');

    const { access_token, refresh_token } = await this.authService.loginWithFaceLive(sessionId, device);

    const isTunnel = process.env.VITE_API_URL?.includes('devtunnels.ms');
    const isProd = process.env.NODE_ENV === 'production' || isTunnel;

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    };
    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return { message: 'Authenticated', access_token };
  }
}

