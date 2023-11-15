import { Request } from 'express';

export type AuthTokens = {
  refreshToken: string;
  authToken: string;
};

export type AuthTokenPayload = {
  user: {
    id: string;
    email: string;
  };
  iat: number;
  exp: number;
  sub: string;
};

export type AuthTokenVerificationResult =
  | {
      status: 'valid' | 'expired';
      payload: AuthTokenPayload;
    }
  | {
      status: 'invalid';
    };

export interface AuthorizedRequest extends Request {
  user: {
    id: string;
  };
}
