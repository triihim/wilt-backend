import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      // 'any' type to avoid listing all possible db types as a union.
      type: this.configService.getOrThrow<any>('DB_TYPE'),
      host: this.configService.getOrThrow<string>('DB_HOST'),
      port: this.configService.getOrThrow<number>('DB_PORT'),
      username: this.configService.getOrThrow<string>('DB_USERNAME'),
      password: this.configService.getOrThrow<string>('DB_PASSWORD'),
      database: this.configService.getOrThrow<string>('DB_NAME'),
      synchronize: ['development', 'test'].some((env) => process.env.NODE_ENV === env),
      logging: process.env.NODE_ENV === 'development' ? 'all' : false,
      autoLoadEntities: true,
    };
  }
}
