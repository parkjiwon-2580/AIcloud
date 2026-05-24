import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readEnv, readNumberEnv } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: readEnv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
  });
  await app.listen(readNumberEnv('PORT', 3003));
}

bootstrap();
