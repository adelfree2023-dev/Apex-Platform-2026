import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { commonProviders, mockConfig } from '../test/test-utils';

describe('Bootstrap (main)', () => {
  let app: INestApplication;
  const mockLogger = { log: jest.fn(), error: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfig)
      .overrideProvider(Logger)
      .useValue(mockLogger);

    // Apply common providers to overwrite any missing dependencies in AppModule deep hierarchy
    commonProviders.forEach(p => {
      if ('provide' in p) {
        module.overrideProvider(p.provide).useValue((p as any).useValue);
      }
    });

    const compiled = await module.compile();

    app = compiled.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (root) returns ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-ID', 'test')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
  });
});
