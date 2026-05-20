import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

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