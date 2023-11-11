import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload, AuthorizedRequest } from './types/auth.types';
import { isTokenExpiredError } from './helpers/token.helpers';

export const AllowUnauthorizedRequest = () =>
  SetMetadata('allowUnauthorizedRequest', true);

export const AllowExpiredAuthToken = () =>
  SetMetadata('allowExpiredAuthToken', true);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuthCheck = !!this.reflector.get<boolean | undefined>(
      'allowUnauthorizedRequest',
      context.getHandler(),
    );

    if (skipAuthCheck) {
      return true;
    }

    const allowExpiredAuthToken = !!this.reflector.get<boolean | undefined>(
      'allowExpiredAuthToken',
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('authorization');

    if (!authHeader) {
      return false;
    }

    const tokenSecret = this.configService.get<string>('TOKEN_SECRET');

    if (!tokenSecret) {
      this.logger.error('Token secret missing');
      return false;
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.error('Invalid authorization header');
      return false;
    }

    const authToken = authHeader.split(' ')[1];
    let decodedToken: AuthTokenPayload | null = null;

    try {
      decodedToken = jwt.verify(authToken, tokenSecret) as AuthTokenPayload;
    } catch (e: unknown) {
      if (isTokenExpiredError(e) && allowExpiredAuthToken) {
        decodedToken = jwt.decode(authToken) as AuthTokenPayload;
      } else {
        this.logger.error(e);
      }
    } finally {
      if (decodedToken) {
        (request as AuthorizedRequest).user = { id: decodedToken.sub };
        return true;
      }
      return false;
    }
  }
}
