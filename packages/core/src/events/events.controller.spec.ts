import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Request } from 'express';
import { HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('EventsController (e2e)', () => {
  let app: INestApplication;
  const mockService = {
    emit: jest.fn().mockResolvedValue({ id: 'uuid', status: 'queued' }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: mockService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/events – success', async () => {
    const payload = { type: 'order.created', territory: 'US', businessType: 'RETAIL', payload: {} };
    await request(app.getHttpServer())
      .post('/api/events')
      .set('x-tenant-id', 'tenant-1')
      .send(payload)
      .expect(HttpStatus.CREATED)
      .expect({ id: 'uuid', status: 'queued' });

    expect(mockService.emit).toHaveBeenCalledWith('tenant-1', payload);
  });

  it('GET /api/events/:id – success', async () => {
    // Assume getEventStatus returns a simple object
    (mockService as any).getEventStatus = jest.fn().mockResolvedValue({ id: 'uuid', status: 'processed' });

    await request(app.getHttpServer())
      .get('/api/events/uuid')
      .set('x-tenant-id', 'tenant-1')
      .expect(HttpStatus.OK)
      .expect({ id: 'uuid', status: 'processed' });

    expect((mockService as any).getEventStatus).toHaveBeenCalledWith('tenant-1', 'uuid');
  });
});
