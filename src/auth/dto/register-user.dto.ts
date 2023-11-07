import { IsEmail, IsStrongPassword } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 10,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;
}
