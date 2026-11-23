import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { readFileSync, existsSync } from 'fs';
import { createServer as createHttpsServer } from 'https';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: process.env.MERCHANT_WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Device-Agent-Token',
      'X-Enrollment-Token',
    ],
  });
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  const certPath = process.env.TLS_CERT_PATH?.trim();
  const keyPath = process.env.TLS_KEY_PATH?.trim();
  const httpsPort = process.env.HTTPS_PORT
    ? Number(process.env.HTTPS_PORT)
    : 3443;
  if (certPath && keyPath && existsSync(certPath) && existsSync(keyPath)) {
    const expressApp = app.getHttpAdapter().getInstance();
    createHttpsServer(
      {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
      },
      expressApp,
    ).listen(httpsPort);
  }
}

void bootstrap();
