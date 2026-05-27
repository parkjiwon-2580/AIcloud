import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
<<<<<<< HEAD

import { AppModule } from './app.module';

async function bootstrap() {

  console.log('BOOTSTRAP START');

  const app =
    await NestFactory.create(
      AppModule,
    );

  console.log('APP CREATED');

  app.enableCors();

  await app.listen(3001);

  console.log('SERVER RUNNING ON 3001');
}

bootstrap();
=======
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
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
