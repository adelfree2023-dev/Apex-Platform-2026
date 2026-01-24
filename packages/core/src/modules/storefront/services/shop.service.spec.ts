import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { RateLimiterService } from '../../../common/access-control/services/rate-limiter.service';
import { EncryptedFieldService as EncryptionService } from '../../../common/security/encryption/encrypted-field.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CartItemDto } from '../dto/cart-item.dto';
import { CustomerInfoDto } from '../dto/customer-info.dto';
import { ShippingAddressDto } from '../dto/shipping-address.dto';

describe('ShopService', () => {
  let service: ShopService;
  const mockPrisma = {
    product: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
  };
  const mockTenantCtx = {
    getTenantSchema: jest.fn().mockResolvedValue('public'),
    getCurrentTenant: jest.fn().mockReturnValue({ id: 't-uuid' })
  };
  const mockRateLimiter = {
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, currentRequests: 1, maxRequests: 5 })
  };
  const mockEncryption = {
    encryptSensitiveData: jest.fn((data) => `encrypted:${data}`),
    decryptSensitiveData: jest.fn((data) => data.replace('encrypted:', ''))
  };
  const mockAudit = {
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn()
  };
  const mockMail = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantCtx },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: AuditService, useValue: mockAudit },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  describe('checkRateLimit', () => {
    it('should not throw when within limits', async () => {
      await expect(service.checkRateLimit('t-uuid', '1.2.3.4')).resolves.not.toThrow();
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        'checkout:t-uuid:1.2.3.4',
        { maxRequests: 5, windowMs: 60000 }
      );
    });

    it('should throw HttpException when limit exceeded', async () => {
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
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
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'EMPTY_CART_ATTEMPT',
        expect.objectContaining({ tenantId: 't-uuid' })
      );
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
        expect.objectContaining({ tenantId: 't-uuid' })
      );
    });

    it('should reject insufficient stock', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce({
        id: 'p1',
        name: 'Product 1',
        price: 10,
        salePrice: null,
        stock: 1, // Only 1 in stock
        currency: 'USD'
      });
      const items = [{ ...validItems[0], quantity: 2 }];
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
        expect.objectContaining({ tenantId: 't-uuid', totalAmount: 200000 })
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
        price: 12, // Uses sale price if available
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
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1', tenantId: 't-uuid' },
        data: { stock: { decrement: 2 } }
      });
      expect(mockEncryption.encryptSensitiveData).toHaveBeenCalledTimes(2);
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'ORDER_CREATED_IN_TRANSACTION'
        })
      );
    });

    it('should roll back stock update on order failure', async () => {
      mockPrisma.$transaction.mockImplementation(() => {
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
          tenantId: 't-uuid'
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

      expect(mockMail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ali@example.com',
          subject: 'تأكيد طلبك #ORD-123 - My Store'
        })
      );
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-uuid',
          action: 'ORDER_CONFIRMATION_SENT'
        })
      );
    });

    it('should handle decryption failure gracefully', async () => {
      const order = {
        id: 'order-123',
        customerInfo: 'invalid-encrypted-data'
      };
      const tenant = { id: 't-uuid', storeName: 'My Store' };

      await service.sendOrderConfirmation(order as any, tenant as any);

      expect(mockMail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'unknown@example.com'
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

    it('should return null when order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      const result = await service.getOrderById('t-uuid', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate valid order number format', () => {
      const orderNumber = (service as any).generateOrderNumber('tenant-uuid');
      expect(orderNumber).toMatch(/TENA\-\d+\-[A-Z0-9]{6}/);
    });
  });
});
