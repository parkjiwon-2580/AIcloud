import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { readEnv, readNumberEnv } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: readEnv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
  });

  const port = readNumberEnv('PORT', 3002);
  await app.listen(port);
}

bootstrap();
