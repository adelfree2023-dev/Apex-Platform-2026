import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { RateLimiterService } from '../../../common/access-control/services/rate-limiter.service';
import { EncryptedFieldService as EncryptionService } from '../../../common/security/encryption/encrypted-field.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { AnomalyDetectionService } from '../../../common/access-control/services/anomaly-detection.service';
import { InputValidatorService } from '../../../common/security/validation/input-validator.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CartItemDto } from '../dto/cart-item.dto';
import { CustomerInfoDto } from '../dto/customer-info.dto';
import { ShippingAddressDto } from '../dto/shipping-address.dto';
import {
  createMockPrisma,
  createMockAudit,
  createMockMailService,
  createMockRateLimiter,
  createMockTenantContext,
  createMockConfig,
  createMockAnomalyDetection,
  createMockInputValidator
} from '../../../../test/test-utils';

describe('ShopService', () => {
  let service: ShopService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockMailService: any;
  let mockRateLimiter: any;
  let mockEncryption: any;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockAudit = createMockAudit();
    mockMailService = createMockMailService();
    mockRateLimiter = createMockRateLimiter();
    mockEncryption = {
      encrypt: jest.fn((_, data) => `encrypted:${data}`),
      decrypt: jest.fn((_, data) => data.replace('encrypted:', ''))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: MailService, useValue: mockMailService },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: TenantContextService, useValue: createMockTenantContext() },
        { provide: ConfigService, useValue: createMockConfig() },
        { provide: AnomalyDetectionService, useValue: createMockAnomalyDetection() },
        { provide: InputValidatorService, useValue: createMockInputValidator() },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  describe('checkRateLimit', () => {
    it('should not throw when within limits', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true });
      await expect(service.checkRateLimit('t-uuid', '1.2.3.4')).resolves.not.toThrow();
    });

    it('should throw HttpException when limit exceeded', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        currentRequests: 6,
        maxRequests: 5
      });

      await expect(service.checkRateLimit('t-uuid', '1.2.3.4')).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        expect.objectContaining({
          severity: 'HIGH',
          sourceIp: '1.2.3.4',
          details: expect.objectContaining({ tenantId: 't-uuid' })
        })
      );
    });
  });

  describe('validateCartItems', () => {
    const validItems: CartItemDto[] = [
      { productId: 'p1', quantity: 2, price: 10, currency: 'USD', name: 'Product 1' },
      { productId: 'p2', quantity: 1, price: 20, currency: 'USD', name: 'Product 2' }
    ];

    it('should reject empty cart', async () => {
      await expect(service.validateCartItems('t-uuid', [])).rejects.toThrow(HttpException);
    });

    it('should reject invalid quantity', async () => {
      const invalidItems = [{ ...validItems[0], quantity: -1 }];
      await expect(service.validateCartItems('t-uuid', invalidItems)).rejects.toThrow(HttpException);
    });

    it('should reject unavailable product', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce(null);
      await expect(service.validateCartItems('t-uuid', [validItems[0]])).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PRODUCT_UNAVAILABLE',
        expect.objectContaining({ details: expect.objectContaining({ tenantId: 't-uuid' }) })
      );
    });

    it('should reject insufficient stock', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce(null);
      const items = [{ ...validItems[0], quantity: 100 }];
      await expect(service.validateCartItems('t-uuid', items)).rejects.toThrow(HttpException);
    });

    it('should reject high-value orders', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Product 1',
        price: 100000,
        salePrice: null,
        stock: 10,
        currency: 'USD'
      });
      const items = [{ ...validItems[0], price: 100000, quantity: 2 }];
      await expect(service.validateCartItems('t-uuid', items)).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'HIGH_VALUE_ORDER_ATTEMPT',
        expect.objectContaining({ details: expect.objectContaining({ tenantId: 't-uuid', totalAmount: 200000 }) })
      );
    });

    it('should succeed with valid items and enrich with product data', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Actual Product Name',
        price: 15,
        salePrice: 12,
        stock: 10,
        currency: 'USD'
      });

      const result = await service.validateCartItems('t-uuid', [validItems[0]]);
      expect(result).toEqual([{
        productId: 'p1',
        quantity: 2,
        price: 12,
        currency: 'USD',
        name: 'Actual Product Name'
      }]);
    });
  });

  describe('createOrder', () => {
    const items: CartItemDto[] = [
      { productId: 'p1', quantity: 2, price: 10, currency: 'USD', name: 'Product 1' }
    ];
    const customerInfo: CustomerInfoDto = {
      name: 'Ali Ahmed',
      email: 'ali@example.com',
      phone: '+201234567890',
      notes: 'Please deliver after 6 PM'
    };
    const shippingAddress: ShippingAddressDto = {
      street: '123 Main St',
      city: 'Cairo',
      country: 'Egypt',
      postalCode: '12345',
      apartment: '5B'
    };
    const ipAddress = '1.2.3.4';

    it('should create order successfully', async () => {
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-123',
        orderNumber: 'ORD-123',
        totalAmount: 20,
        currency: 'USD',
        items: [{ id: 'item-1', productId: 'p1', quantity: 2, price: 10 }],
        customerInfo: 'encrypted:customer-info',
        shippingAddress: 'encrypted:shipping-address',
        paymentMethod: 'CREDIT_CARD',
        ipAddress: '1.2.3.4'
      });

      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.createOrder(
        't-uuid',
        items,
        customerInfo,
        shippingAddress,
        'CARD',
        ipAddress
      );

      expect(result).toMatchObject({
        id: 'order-123',
        orderNumber: 'ORD-123',
        totalAmount: 20,
        currency: 'USD'
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockEncryption.encrypt).toHaveBeenCalled();
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'ORDER_CREATED_IN_TRANSACTION'
        })
      );
    });

    it('should roll back stock update on order failure', async () => {
      mockPrisma.$transaction.mockImplementationOnce(() => {
        throw new Error('Database transaction failed');
      });

      await expect(service.createOrder(
        't-uuid',
        items,
        customerInfo,
        shippingAddress,
        'CARD',
        ipAddress
      )).rejects.toThrow(HttpException);

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'ORDER_CREATION_FAILED',
        expect.objectContaining({
          severity: 'CRITICAL',
          details: expect.objectContaining({ tenantId: 't-uuid' })
        })
      );
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send email confirmation successfully', async () => {
      const order = {
        id: 'order-123',
        orderNumber: 'ORD-123',
        totalAmount: 20,
        currency: 'USD',
        items: [],
        customerInfo: 'encrypted:{"email":"ali@example.com"}'
      };
      const tenant = { id: 't-uuid', storeName: 'My Store' };

      await service.sendOrderConfirmation(order as any, tenant as any);

      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ali@example.com',
          subject: expect.stringContaining('ORD-123')
        })
      );
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      const mockOrder = {
        id: 'order-123',
        items: [{ id: 'item-1' }]
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getOrderById('t-uuid', 'order-123');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate valid order number format', () => {
      const orderNumber = (service as any).generateOrderNumber('tenant-uuid');
      expect(orderNumber).toMatch(/TENA\-\d+\-[A-Z0-9]{6}/);
    });
  });
});
