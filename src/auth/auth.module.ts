import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuthController } from './auth.controller';
import { RefreshToken } from './entities/refresh-token.entity';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { Login } from './entities/login.entity';
import { Learning } from '../learning/entities/learning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, Login, Learning])],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  controllers: [AuthController],
})
export class AuthModule {}
