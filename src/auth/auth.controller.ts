import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { RegistrationRequestDto } from './dto/registration-request.dto';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  async register(@Body() registerDto: RegistrationRequestDto): Promise<void> {
    try {
      await this.authService.registerUser(
        registerDto.email,
        registerDto.password,
      );
    } catch (e: unknown) {
      throw new HttpException(
        'registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/login')
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    try {
      const authToken = await this.authService.loginUser(
        loginDto.email,
        loginDto.password,
      );
      return authToken;
    } catch (e: unknown) {
      throw new HttpException('forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
