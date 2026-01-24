import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from '../tenants.controller';
import { TenantsService } from '../tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('TenantsController (e2e)', () => {
  let app: INestApplication;
  const mockTenantsService = {
    createTenantWithStore: jest.fn().mockResolvedValue({
      id: 'tenant-uuid',
      subdomain: 'demo',
      schemaName: 'tenant_demo_schema',
      storeUrl: 'https://demo.apex-platform.com',
      dashboardUrl: 'https://admin.demo.apex-platform.com'
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: mockTenantsService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /register', () => {
    const validPayload: CreateTenantDto = {
      storeName: 'Demo Store',
      subdomain: 'demo',
      businessType: 'retail',
      email: 'owner@demo.com',
      password: 'SuperStrongPass123!',
    };

    it('should create new tenant successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tenants/register')
        .send(validPayload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        id: 'tenant-uuid',
        subdomain: 'demo',
        storeUrl: 'https://demo.apex-platform.com'
      });

      expect(mockTenantsService.createTenantWithStore).toHaveBeenCalledWith(validPayload);
    });

    it('should handle service errors', async () => {
      mockTenantsService.createTenantWithStore.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await request(app.getHttpServer())
        .post('/api/tenants/register')
        .send(validPayload)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
