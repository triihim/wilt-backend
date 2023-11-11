import { IsNotEmpty } from 'class-validator';

export class AuthTokenDto {
  @IsNotEmpty()
  refreshToken: string;

  @IsNotEmpty()
  authToken: string;
}
