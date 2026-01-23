import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopService } from '../services/shop.service';
import { ProductService } from '../../products/services/product.service';
import { CategoryService } from '../../categories/services/category.service';
import { TenantsService } from '../../tenants/tenants.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { InputValidatorService } from '../../../common/security/validation/input-validator.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('ShopController (e2e)', () => {
  let app: INestApplication;
  const mockTenants = {
    getTenantBySubdomain: jest.fn().mockResolvedValue({ id: 't-uuid', name: 'Demo Store', currency: 'USD' }),
  };
  const mockProduct = {
    findProductsByTenant: jest.fn().mockResolvedValue({
      items: [{ id: 'p1', name: 'Product 1', price: 10 }],
      total: 1
    }),
    findOneByTenant: jest.fn().mockResolvedValue({
      id: 'p1',
      name: 'Product 1',
      price: 10,
      description: 'Test product',
      stock: 10,
      category: 'Electronics'
    }),
  };
  const mockCategory = {
    findCategoriesByTenant: jest.fn().mockResolvedValue([
      { id: 'c1', name: 'Electronics', slug: 'electronics' }
    ]),
  };
  const mockShop = {
    checkRateLimit: jest.fn(),
    validateCartItems: jest.fn().mockResolvedValue([
      { productId: 'p1', quantity: 2, price: 10, currency: 'USD', name: 'Product 1' }
    ]),
    createOrder: jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-001',
      totalAmount: 20,
      currency: 'USD',
      status: 'CONFIRMED',
      items: [],
      createdAt: new Date()
    }),
    sendOrderConfirmation: jest.fn(),
    getOrderById: jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-001',
      totalAmount: 20,
      currency: 'USD',
      status: 'CONFIRMED',
      items: [],
      shippingAddress: {},
      customerInfo: {},
      createdAt: new Date()
    }),
  };
  const mockAudit = {
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn()
  };
  const mockValidator = {
    secureValidate: jest.fn((schema, data) => Promise.resolve(data)),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: TenantsService, useValue: mockTenants },
        { provide: ProductService, useValue: mockProduct },
        { provide: CategoryService, useValue: mockCategory },
        { provide: ShopService, useValue: mockShop },
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

  const tenantSubdomain = 'demo';

  describe('GET /:tenantSubdomain/products', () => {
    it('should return products successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/products?page=1&limit=10`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'p1', name: 'Product 1' })
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      expect(mockTenants.getTenantBySubdomain).toHaveBeenCalledWith(tenantSubdomain);
      expect(mockProduct.findProductsByTenant).toHaveBeenCalledWith('t-uuid', 1, 10, undefined, undefined);
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'VIEW_PRODUCTS'
        })
      );
    });

    it('should reject invalid page number', async () => {
      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/products?page=invalid&limit=10`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid limit', async () => {
      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/products?page=1&limit=101`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle non-existent tenant', async () => {
      mockTenants.getTenantBySubdomain.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get(`/api/shop/invalid-store/products?page=1&limit=10`)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'SHOP_ACCESS_ATTEMPT',
        expect.objectContaining({
          severity: 'MEDIUM',
          tenantSubdomain: 'invalid-store'
        })
      );
    });
  });

  describe('GET /:tenantSubdomain/products/:productId', () => {
    it('should return product details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/products/p1`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: 'p1',
        name: 'Product 1',
        price: 10,
        description: 'Test product'
      });

      expect(mockProduct.findOneByTenant).toHaveBeenCalledWith('t-uuid', 'p1');
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'VIEW_PRODUCT'
        })
      );
    });

    it('should handle non-existent product', async () => {
      mockProduct.findOneByTenant.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/products/invalid`)
        .expect(HttpStatus.NOT_FOUND);

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PRODUCT_ACCESS_ATTEMPT',
        expect.objectContaining({
          severity: 'LOW',
          productId: 'invalid'
        })
      );
    });
  });

  describe('GET /:tenantSubdomain/categories', () => {
    it('should return categories', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/categories`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([
        expect.objectContaining({ id: 'c1', name: 'Electronics' })
      ]);

      expect(mockCategory.findCategoriesByTenant).toHaveBeenCalledWith('t-uuid');
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'VIEW_CATEGORIES'
        })
      );
    });
  });

  describe('POST /:tenantSubdomain/checkout', () => {
    const validCheckout = {
      items: [
        { productId: 'p1', quantity: 2, price: 10, currency: 'USD', name: 'Product 1' }
      ],
      customerInfo: {
        name: 'Ali Ahmed',
        email: 'ali@example.com',
        phone: '+201234567890'
      },
      shippingAddress: {
        street: '123 Main St',
        city: 'Cairo',
        country: 'Egypt',
        postalCode: '12345'
      },
      paymentMethod: 'CREDIT_CARD',
    };

    it('should process checkout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenantSubdomain}/checkout`)
        .send(validCheckout)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        orderNumber: 'ORD-001',
        totalAmount: 20,
        currency: 'USD',
        status: 'CONFIRMED',
        estimatedDelivery: expect.any(String)
      });

      expect(mockShop.checkRateLimit).toHaveBeenCalledWith('t-uuid', expect.any(String));
      expect(mockShop.validateCartItems).toHaveBeenCalledWith('t-uuid', validCheckout.items);
      expect(mockShop.createOrder).toHaveBeenCalledWith(
        't-uuid',
        expect.any(Array),
        validCheckout.customerInfo,
        validCheckout.shippingAddress,
        'CREDIT_CARD',
        expect.any(String)
      );
      expect(mockShop.sendOrderConfirmation).toHaveBeenCalled();
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'ORDER_CREATED',
          details: expect.objectContaining({ totalAmount: 20 })
        })
      );
    });

    it('should reject invalid checkout data', async () => {
      const invalidCheckout = { ...validCheckout, items: [] }; // Empty cart

      await request(app.getHttpServer())
        .post(`/api/shop/${tenantSubdomain}/checkout`)
        .send(invalidCheckout)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /:tenantSubdomain/orders/:orderId', () => {
    it('should return order details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/orders/order-1`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: 'order-1',
        orderNumber: 'ORD-001',
        totalAmount: 20,
        currency: 'USD',
        status: 'CONFIRMED',
        createdAt: expect.any(String)
      });

      expect(mockShop.getOrderById).toHaveBeenCalledWith('t-uuid', 'order-1');
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'VIEW_ORDER'
        })
      );
    });

    it('should handle non-existent order', async () => {
      mockShop.getOrderById.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/orders/invalid`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
