import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
  Res,
  UseGuards
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }



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
}

