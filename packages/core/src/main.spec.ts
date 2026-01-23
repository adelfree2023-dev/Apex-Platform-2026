import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('Bootstrap (main)', () => {
  let app: INestApplication;
  const mockConfig = { get: jest.fn().mockReturnValue('test') };
  const mockLogger = { log: jest.fn(), error: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfig)
      .overrideProvider(Logger)
      .useValue(mockLogger)
      .compile();

    app = module.createNestApplication();
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
