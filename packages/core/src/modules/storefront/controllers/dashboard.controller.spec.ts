import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getCommonProviders } from '../../../../test/test-utils';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let mockDashboard: any;

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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        ...getCommonProviders(),
        { provide: DashboardService, useValue: mockDashboard },
      ],
    }).compile();

    app = module.createNestApplication();

    app.use((req: any, res: any, next: any) => {
      req.tenant = { id: 't-uuid', name: 'Demo Store' };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const tenantSub = 'demo';

  describe('GET /overview', () => {
    it('should return dashboard overview successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/overview`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        sales: expect.objectContaining({ totalSales: 1000 }),
      });
    });
  });
});
