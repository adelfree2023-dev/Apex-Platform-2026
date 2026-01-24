import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getCommonProviders, createMockPrisma } from '../../../../test/test-utils';
import { PrismaService } from '../../../prisma/prisma.service';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let mockDashboard: any;
  let mockPrisma: any;

  beforeAll(async () => {
    mockDashboard = {
      getOverview: jest.fn().mockResolvedValue({
        sales: { totalSales: 1000, orderCount: 10 },
        inventory: { lowStockProducts: [] },
        orders: { orderStatuses: [] },
        products: { topProducts: [] },
        customers: { newCustomers: 5 }
      }),
      getSalesReport: jest.fn().mockResolvedValue({ report: 'sales' }),
      getProductsReport: jest.fn().mockResolvedValue({ report: 'products' }),
      getCustomersReport: jest.fn().mockResolvedValue({ report: 'customers' }),
      getDashboardAlerts: jest.fn().mockResolvedValue([]),
    };

    mockPrisma = createMockPrisma();
    // 🛡️ S2: Ensure tenant is found by guard
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Store',
      status: 'ACTIVE',
      subdomain: 'demo'
    });

    // 🛡️ S2: Mock schema existence for isolation check
    mockPrisma.$queryRaw.mockResolvedValue([{ schema_name: 'tenant_00000000_0000_0000_0000_000000000001' }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        ...getCommonProviders(),
        { provide: DashboardService, useValue: mockDashboard },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const tenantSub = 'demo';
  const validTenantId = '00000000-0000-0000-0000-000000000001';

  describe('GET /overview', () => {
    it('should return dashboard overview successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/overview`)
        .set('x-tenant-id', validTenantId)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        sales: expect.objectContaining({ totalSales: 1000 }),
      });
    });
  });

  describe('GET /alerts', () => {
    it('should return dashboard alerts', async () => {
      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/alerts`)
        .set('x-tenant-id', validTenantId)
        .expect(HttpStatus.OK);

      expect(mockDashboard.getDashboardAlerts).toHaveBeenCalled();
    });
  });

  describe('GET /sales', () => {
    it('should return sales report', async () => {
      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/sales`)
        .set('x-tenant-id', validTenantId)
        .expect(HttpStatus.OK);

      expect(mockDashboard.getSalesReport).toHaveBeenCalled();
    });
  });

  describe('GET /products', () => {
    it('should return products report', async () => {
      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/products`)
        .set('x-tenant-id', validTenantId)
        .expect(HttpStatus.OK);

      expect(mockDashboard.getProductsReport).toHaveBeenCalled();
    });
  });

  describe('GET /customers', () => {
    it('should return customers report', async () => {
      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/customers`)
        .set('x-tenant-id', validTenantId)
        .expect(HttpStatus.OK);

      expect(mockDashboard.getCustomersReport).toHaveBeenCalled();
    });
  });
});
