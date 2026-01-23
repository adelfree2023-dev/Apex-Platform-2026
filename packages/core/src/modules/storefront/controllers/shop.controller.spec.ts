import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopService } from '../services/shop.service';
import { ProductService } from '../../products/services/product.service';
import { CategoryService } from '../../categories/services/category.service';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('ShopController (e2e)', () => {
  let app: INestApplication;
  const mockTenantCtx = {
    getTenantBySubdomain: jest.fn().mockResolvedValue({ id: 't-uuid', name: 'Demo' }),
  };
  const mockProduct = {
    findProductsByTenant: jest.fn().mockResolvedValue({
      items: [{ id: 'p1', name: 'Product 1' }],
      total: 1,
    }),
    findOneByTenant: jest.fn().mockResolvedValue({ id: 'p1', name: 'Product 1' }),
  };
  const mockCategory = {
    findCategoriesByTenant: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Cat 1' }]),
  };
  const mockShop = {
    checkRateLimit: jest.fn(),
    validateCartItems: jest.fn().mockResolvedValue([]),
    createOrder: jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-001',
      totalAmount: 120,
      currency: 'USD',
      items: [],
    }),
    sendOrderConfirmation: jest.fn(),
    getOrderById: jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-001',
      totalAmount: 120,
      currency: 'USD',
      items: [],
    }),
  };
  const mockAudit = { logActivity: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: TenantContextService, useValue: mockTenantCtx },
        { provide: ProductService, useValue: mockProduct },
        { provide: CategoryService, useValue: mockCategory },
        { provide: ShopService, useValue: mockShop },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenant = 'demo';

  it('GET /:tenantSubdomain/products – success', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenant}/products?page=1&limit=10`)
      .expect(HttpStatus.OK)
      .expect(expect.objectContaining({ data: expect.any(Array) }));

    expect(mockTenantCtx.getTenantBySubdomain).toHaveBeenCalledWith(tenant);
    expect(mockProduct.findProductsByTenant).toHaveBeenCalled();
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });

  it('GET /:tenantSubdomain/products/:productId – success', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenant}/products/p1`)
      .expect(HttpStatus.OK)
      .expect(expect.objectContaining({ id: 'p1' }));

    expect(mockProduct.findOneByTenant).toHaveBeenCalledWith('t-uuid', 'p1');
  });

  it('GET /:tenantSubdomain/categories – success', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenant}/categories`)
      .expect(HttpStatus.OK)
      .expect(expect.arrayContaining([expect.objectContaining({ id: 'c1' })]));

    expect(mockCategory.findCategoriesByTenant).toHaveBeenCalledWith('t-uuid');
  });

  it('POST /:tenantSubdomain/checkout – success', async () => {
    const payload = {
      items: [{ productId: 'p1', quantity: 2, price: 30, currency: 'USD', name: 'Prod 1' }],
      customerInfo: { name: 'Ali', email: 'ali@example.com', phone: '+201111111111' },
      shippingAddress: {
        street: 'Street',
        city: 'Cairo',
        country: 'EG',
        postalCode: '12345',
      },
      paymentMethod: 'CREDIT_CARD',
    };
    await request(app.getHttpServer())
      .post(`/api/shop/${tenant}/checkout`)
      .send(payload)
      .expect(HttpStatus.CREATED)
      .expect(expect.objectContaining({ orderNumber: expect.any(String) }));

    expect(mockShop.checkRateLimit).toHaveBeenCalled();
    expect(mockShop.validateCartItems).toHaveBeenCalled();
    expect(mockShop.createOrder).toHaveBeenCalled();
    expect(mockShop.sendOrderConfirmation).toHaveBeenCalled();
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });

  it('GET /:tenantSubdomain/orders/:orderId – success', async () => {
    await request(app.getHttpServer())
      .get(`/api/shop/${tenant}/orders/order-1`)
      .expect(HttpStatus.OK)
      .expect(expect.objectContaining({ id: 'order-1' }));

    expect(mockShop.getOrderById).toHaveBeenCalledWith('t-uuid', 'order-1');
  });
});
