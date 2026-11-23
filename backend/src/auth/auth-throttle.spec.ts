import { Controller, INestApplication, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';

@Controller('auth')
class ProbeAuthController {
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @Post('login')
  login() {
    return { ok: true };
  }
}

describe('auth throttle', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 100 },
        ]),
      ],
      controllers: [ProbeAuthController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after login throttle limit', async () => {
    const server = app.getHttpServer();
    await request(server).post('/auth/login').expect(201);
    await request(server).post('/auth/login').expect(201);
    await request(server).post('/auth/login').expect(429);
  });
});
