import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const corsOrigins = app.get(ConfigService).getOrThrow<string>('CORS_ORIGINS');

  app.enableCors({
    origin: corsOrigins.split(/\s+/),
  });

  await app.listen(process.env.PORT ? +process.env.PORT : 80);
}
bootstrap();
