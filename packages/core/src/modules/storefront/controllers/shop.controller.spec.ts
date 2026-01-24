import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopService } from '../services/shop.service';
import { ProductService } from '../../products/services/product.service';
import { CategoryService } from '../../categories/services/category.service';
import { TenantsService } from '../../tenants/tenants.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getCommonProviders } from '../../../../test/test-utils';

describe('ShopController (e2e)', () => {
  let app: INestApplication;
  let mockTenants: any;
  let mockProduct: any;
  let mockCategory: any;
  let mockShop: any;

  beforeAll(async () => {
    mockTenants = {
      getTenantBySubdomain: jest.fn().mockResolvedValue({ id: 't-uuid', name: 'Demo Store', currency: 'USD' }),
    };
    mockProduct = {
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
    mockCategory = {
      findCategoriesByTenant: jest.fn().mockResolvedValue([
        { id: 'c1', name: 'Electronics', slug: 'electronics' }
      ]),
    };
    mockShop = {
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        ...getCommonProviders(),
        { provide: TenantsService, useValue: mockTenants },
        { provide: ProductService, useValue: mockProduct },
        { provide: CategoryService, useValue: mockCategory },
        { provide: ShopService, useValue: mockShop },
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
        total: 1
      });
    });
  });

  describe('GET /:tenantSubdomain/products/:productId', () => {
    it('should return product details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/shop/${tenantSubdomain}/products/p1`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: 'p1',
        name: 'Product 1'
      });
    });
  });

  describe('POST /:tenantSubdomain/checkout', () => {
    const validCheckout = {
      tenantId: '00000000-0000-0000-0000-000000000001',
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
        totalAmount: 20
      });
    });
  });
});
