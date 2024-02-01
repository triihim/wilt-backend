import { Request } from 'express';

export type AuthTokens = {
  refreshToken: string;
  authToken: string;
};

export type DecodedAuthToken = {
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
      payload: DecodedAuthToken;
    }
  | {
      status: 'invalid';
    };

export interface AuthorizedRequest extends Request {
  user: {
    id: string;
  };
}
