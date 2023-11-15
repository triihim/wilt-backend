import { CanActivate, ExecutionContext, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthorizedRequest } from './types/auth.types';

export const AllowUnauthorizedRequest = () => SetMetadata('allowUnauthorizedRequest', true);

export const AllowExpiredAuthToken = () => SetMetadata('allowExpiredAuthToken', true);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuthCheck = !!this.reflector.get<boolean | undefined>('allowUnauthorizedRequest', context.getHandler());

    if (skipAuthCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('authorization');

    if (!authHeader) {
      return false;
    }

    const authToken = authHeader.split(' ')[1];
    const allowExpiredToken = !!this.reflector.get<boolean | undefined>('allowExpiredAuthToken', context.getHandler());
    const verificationResult = this.authService.verifyAuthToken(authToken);

    this.logger.log(
      `Auth token verification result: ${verificationResult.status}, ${
        verificationResult.status !== 'invalid' ? verificationResult.payload.sub : ''
      }`,
    );

    if (verificationResult.status !== 'invalid') {
      const payload = verificationResult.payload;
      (request as AuthorizedRequest).user = { id: payload.user.id };
    }

    switch (verificationResult.status) {
      case 'valid':
        return true;
      case 'expired':
        return allowExpiredToken;
      case 'invalid':
      default:
        return false;
    }
  }
}
