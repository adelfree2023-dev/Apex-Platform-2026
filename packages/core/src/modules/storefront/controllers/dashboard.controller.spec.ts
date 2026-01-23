import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { InputValidatorService } from '../../../common/security/validation/input-validator.service';
import { DateRangeDto } from '../dto/date-range.dto';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  const mockDashboard = {
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
    getDashboardAlerts: jest.fn().mockResolvedValue([
      {
        type: 'WARNING',
        title: 'Low Stock',
        message: '3 products have low stock',
        severity: 'MEDIUM'
      }
    ]),
  };
  const mockAudit = { logActivity: jest.fn() };
  const mockValidator = {
    secureValidate: jest.fn((schema, data) => Promise.resolve(data)),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboard },
        { provide: AuditService, useValue: mockAudit },
        { provide: InputValidatorService, useValue: mockValidator },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenantSub = 'demo';
  const tenantHeader = { tenant: { id: 't-uuid', name: 'Demo Store', currency: 'USD' } };

  describe('GET /overview', () => {
    it('should return dashboard overview successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/overview?startDate=2024-01-01&endDate=2024-01-31`)
        .set('x-tenant-id', tenantHeader.tenant.id)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        sales: expect.objectContaining({ totalSales: 1000 }),
      });
      expect(mockDashboard.getOverview).toHaveBeenCalled();
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DASHBOARD_ACCESSED'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockDashboard.getOverview.mockRejectedValueOnce(new Error('Database error'));

      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/overview`)
        .set('x-tenant-id', tenantHeader.tenant.id)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('GET /sales', () => {
    it('should return sales report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/sales?period=MONTH`)
        .set('x-tenant-id', tenantHeader.tenant.id)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ report: 'sales' });
    });
  });

  describe('GET /products', () => {
    it('should return products report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/products?sortBy=SALES&limit=5`)
        .set('x-tenant-id', tenantHeader.tenant.id)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ report: 'products' });
    });
  });

  describe('GET /customers', () => {
    it('should return customers report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/customers?segment=ACTIVE`)
        .set('x-tenant-id', tenantHeader.tenant.id)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ report: 'customers' });
    });
  });

  describe('GET /alerts', () => {
    it('should return dashboard alerts', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSub}/dashboard/alerts`)
        .set('x-tenant-id', tenantHeader.tenant.id)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([
        expect.objectContaining({ type: 'WARNING', title: 'Low Stock' })
      ]);
    });
  });
});
