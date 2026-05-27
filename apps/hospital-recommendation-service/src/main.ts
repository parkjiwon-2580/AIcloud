import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readEnv } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = readEnv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  await app.listen(Number(readEnv('PORT', '3005')));
}

bootstrap();
