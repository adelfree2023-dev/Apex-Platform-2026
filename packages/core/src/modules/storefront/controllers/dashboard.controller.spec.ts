import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../services/dashboard.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { DateRangeDto } from '../dto/date-range.dto';
import { HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  const mockDashboard = {
    getOverview: jest.fn().mockResolvedValue({ sales: {} }),
    getSalesReport: jest.fn().mockResolvedValue({ report: 'sales' }),
    getProductsReport: jest.fn().mockResolvedValue({ report: 'products' }),
    getCustomersReport: jest.fn().mockResolvedValue({ report: 'customers' }),
    getDashboardAlerts: jest.fn().mockResolvedValue([]),
  };
  const mockAudit = { logActivity: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboard },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenantSub = 'demo';
  const tenantHeader = { tenant: { id: 't-uuid', name: 'Demo' } };

  it('GET overview – success', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenantSub}/dashboard/overview?startDate=2024-01-01&endDate=2024-01-31`)
      .set('x-tenant-id', tenantHeader.tenant.id)
      .expect(HttpStatus.OK)
      .expect(expect.objectContaining({ sales: {} }));

    expect(mockDashboard.getOverview).toHaveBeenCalledWith(
      tenantHeader.tenant.id,
      '2024-01-01',
      '2024-01-31',
    );
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });

  it('GET sales – validates query, returns placeholder', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenantSub}/dashboard/sales?period=MONTH`)
      .set('x-tenant-id', tenantHeader.tenant.id)
      .expect(HttpStatus.OK)
      .expect({ report: 'sales' });

    expect(mockDashboard.getSalesReport).toHaveBeenCalled();
  });

  it('GET products – validates sortBy/limit, returns placeholder', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenantSub}/dashboard/products?sortBy=SALES&limit=5`)
      .set('x-tenant-id', tenantHeader.tenant.id)
      .expect(HttpStatus.OK)
      .expect({ report: 'products' });

    expect(mockDashboard.getProductsReport).toHaveBeenCalled();
  });

  it('GET customers – validates segment, returns placeholder', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenantSub}/dashboard/customers?segment=ACTIVE`)
      .set('x-tenant-id', tenantHeader.tenant.id)
      .expect(HttpStatus.OK)
      .expect({ report: 'customers' });

    expect(mockDashboard.getCustomersReport).toHaveBeenCalled();
  });

  it('GET alerts – returns empty array', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenantSub}/dashboard/alerts`)
      .set('x-tenant-id', tenantHeader.tenant.id)
      .expect(HttpStatus.OK)
      .expect([]);
  });
});
