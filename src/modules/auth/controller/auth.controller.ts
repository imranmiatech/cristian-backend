import {Body,Controller,Post,HttpCode,HttpStatus,UnauthorizedException,Req,Res,UseGuards} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../service/auth.service';
import { LoginDto } from '../dto/login.dto';
import { GetUser } from 'src/core/jwt/get-user.decorator';
import { JwtAuthGuard } from 'src/core/jwt/jwt-auth.guard';
import { DeviceInfo, GetDeviceInfo } from '../utils/device-info.decorator';
import { Public } from 'src/core/jwt/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.login(dto, device);
    this.handleCookies(res, access_token, refresh_token);
    
    return { 
      message: 'Authentication successful. Welcome back!', 
      access_token 
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @GetDeviceInfo() device: DeviceInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.['refresh_token'];
    
    if (!token) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const { access_token, refresh_token } = await this.authService.refresh(token, device);
    this.handleCookies(res, access_token, refresh_token);
    
    return { 
      message: 'Token refreshed successfully',
      access_token 
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetUser('id') userId: string,
    @GetUser('jti') jti: string, 
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId, jti);
    this.handleCookies(res, null, null, true); 
    return { 
      message: 'Successfully logged out from this device.'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @GetUser('id') userId: string, 
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logoutAll(userId);
    this.handleCookies(res, null, null, true);
    
    return { message: 'Successfully logged out from all sessions.' };
  }

  

  private handleCookies(res: Response, access: string | null, refresh: string | null, clear = false) {
    const isProd = this.config.get<string>('node_env') === 'production';
    const accessExp = this.config.get<string>('jwt.access_expires_in') || '15m';
    const refreshExp = this.config.get<string>('jwt.refresh_expires_in') || '30d';

    const commonOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as 'none') : ('lax' as 'lax'),
      path: '/',
    };

    if (clear) {
      res.clearCookie('access_token', commonOptions);
      res.clearCookie('refresh_token', commonOptions);
      return;
    }

    const accessMaxAge = this.convertToMs(accessExp); 
    const refreshMaxAge = this.convertToMs(refreshExp);

    res.cookie('access_token', access, { 
      ...commonOptions, 
      maxAge: accessMaxAge 
    });

    res.cookie('refresh_token', refresh, { 
      ...commonOptions, 
      maxAge: refreshMaxAge 
    });
  }


  private convertToMs(timeStr: string): number {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1), 10);
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return value; 
    }
  }


}