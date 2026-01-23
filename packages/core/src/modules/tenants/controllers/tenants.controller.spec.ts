import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('TenantsController (e2e)', () => {
  let app: INestApplication;
  const mockTenants = {
    createTenantWithStore: jest.fn().mockResolvedValue({
      id: 'tenant-uuid',
      subdomain: 'demo',
      schemaName: 'tenant_demo',
      storeUrl: 'https://demo.apex-platform.localhost',
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: mockTenants }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/tenants/register – creates a new tenant', async () => {
    const payload = {
      storeName: 'Demo',
      subdomain: 'demo',
      businessType: 'retail',
      email: 'owner@example.com',
      password: 'SuperStrongPass123',
    };
    await request(app.getHttpServer())
      .post('/api/tenants/register')
      .send(payload)
      .expect(HttpStatus.CREATED)
      .expect(expect.objectContaining({ subdomain: 'demo' }));

    expect(mockTenants.createTenantWithStore).toHaveBeenCalledWith(payload);
  });
});
