import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const corsOrigin = app.get(ConfigService).getOrThrow<string>('CORS_ORIGIN');

  app.enableCors({
    origin: corsOrigin,
  });

  await app.listen(process.env.PORT ? +process.env.PORT : 80);
}
bootstrap();
