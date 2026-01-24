import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { getCommonProviders, mockConfig } from '../test/test-utils';

describe('Bootstrap (main)', () => {
  let app: INestApplication;
  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    // 🛡️ S7: Overwrite ALL common providers globally to satisfy deep hierarchies
    getCommonProviders().forEach(p => {
      if ('provide' in p) {
        moduleBuilder.overrideProvider(p.provide).useValue((p as any).useValue);
      }
    });

    moduleBuilder.overrideProvider(Logger).useValue(mockLogger);

    const compiled = await moduleBuilder.compile();

    app = compiled.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (root) returns ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-ID', 'test')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
  });
});
