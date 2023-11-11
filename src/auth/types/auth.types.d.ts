import { Request } from 'express';

export type AuthTokens = {
  refreshToken: string;
  authToken: string;
};

export type AuthTokenPayload = {
  user: {
    email: string;
  };
  iat: number;
  exp: number;
  sub: string;
};

export interface AuthorizedRequest extends Request {
  user: {
    id: string;
  };
}
