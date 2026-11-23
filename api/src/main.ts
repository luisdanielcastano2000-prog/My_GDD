import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api'); // la API vive en /api; el resto de direcciones son de la web
  app.useBodyParser('json', { limit: '2mb' }); // un GDD grande cabe en una petición
  // Valida lo que llega con las reglas de los DTO y responde 400 con el primer mensaje
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(Object.values(errors[0]?.constraints ?? { e: 'Invalid data.' })[0]),
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
