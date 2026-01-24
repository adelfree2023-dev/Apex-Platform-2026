import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/presentation/filters/all-exceptions.filter';
import { getCommonProviders } from '../test/test-utils';

describe('Bootstrap (main)', () => {
  let app: INestApplication;
  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

  beforeAll(async () => {
    // 🛡️ S7: Simplified bootstrap test focusing on health check without AppModule overhead
    const moduleBuilder = Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        AllExceptionsFilter,
        ...getCommonProviders(),
        { provide: Logger, useValue: mockLogger },
      ],
    });

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
