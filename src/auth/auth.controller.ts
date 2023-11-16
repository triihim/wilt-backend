import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { RegistrationDto } from './dto/registration.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokenDto } from './dto/auth-token.dto';
import { AllowExpiredAuthToken, AllowUnauthorizedRequest } from './auth.guard';
import { AuthorizedRequest } from './types/auth.types';
import { Request } from 'express';
import { getClientIp } from 'request-ip';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AllowUnauthorizedRequest()
  async register(@Body() registerDto: RegistrationDto): Promise<void> {
    try {
      await this.authService.registerUser(registerDto.email, registerDto.password);
    } catch (e: unknown) {
      // Returning a status code of 500 does not explicitly disclose user existence.
      throw new HttpException('registration failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AllowUnauthorizedRequest()
  async login(@Body() loginDto: LoginDto, @Req() request: Request): Promise<AuthTokenDto> {
    try {
      const clientIp = getClientIp(request);
      if (!clientIp) {
        throw new Error('Could not extract client IP');
      }
      const authTokens = await this.authService.loginUser(loginDto.email, loginDto.password, clientIp);
      return authTokens;
    } catch (e: unknown) {
      throw new HttpException('forbidden', HttpStatus.FORBIDDEN);
    }
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @AllowExpiredAuthToken()
  async refreshToken(@Body() authTokenDto: AuthTokenDto, @Req() request: AuthorizedRequest): Promise<AuthTokenDto> {
    try {
      const authTokens = await this.authService.refreshAuthToken(request.user.id, authTokenDto);
      return authTokens;
    } catch (e: unknown) {
      throw new HttpException('forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
