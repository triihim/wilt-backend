import { plainToClass } from 'class-transformer';
import { IsDefined, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsDefined()
  DB_TYPE: string;

  @IsDefined()
  DB_HOST: string;

  @IsDefined()
  DB_PORT: number;

  @IsDefined()
  DB_USERNAME: string;

  @IsDefined()
  DB_PASSWORD: string;

  @IsDefined()
  DB_NAME: string;

  @IsDefined()
  SALT_ROUNDS: number;

  @IsDefined()
  TOKEN_ALGORITHM: string;

  @IsDefined()
  TOKEN_SECRET: string;

  @IsDefined()
  TOKEN_EXPIRES_IN: string;

  @IsDefined()
  REFRESH_TOKEN_EXPIRES_IN: string;

  @IsDefined()
  ALLOW_REGISTRATION: boolean;
}

export function validateConfig(configuration: Record<string, unknown>) {
  const finalConfig = plainToClass(EnvironmentVariables, configuration, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(finalConfig, { skipMissingProperties: false });

  if (errors.length) {
    console.error(errors);
    throw new Error('Missing environment variables');
  }

  return finalConfig;
}
