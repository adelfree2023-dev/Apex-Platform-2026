import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../common/security/tenant-context/tenant-context.service';
import { RateLimiterService } from '../../../common/security/rate-limiter/rate-limiter.service';
import { EncryptionService } from '../../../common/security/encryption/encryption.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { HttpException, HttpStatus } from '@nestjs/common';

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
    payment: { create: jest.fn() },
  };
  const mockTenantCtx = { getTenantSchema: jest.fn().mockResolvedValue('public') };
  const mockRateLimiter = { checkLimit: jest.fn().mockResolvedValue({ allowed: true }) };
  const mockEncryption = { encryptSensitiveData: jest.fn().mockReturnValue('enc') };
  const mockAudit = { logActivity: jest.fn(), logSecurityEvent: jest.fn() };
  const mockMail = { sendEmail: jest.fn().mockResolvedValue(undefined) };

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

  it('checkRateLimit – throws when limit exceeded', async () => {
    mockRateLimiter.checkLimit.mockResolvedValueOnce({ allowed: false, currentRequests: 6, maxRequests: 5 });
    await expect(service.checkRateLimit('t-uuid', '1.2.3.4')).rejects.toThrow(HttpException);
  });

  it('validateCartItems – rejects unavailable product', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.validateCartItems('t-uuid', [{ productId: 'p1', quantity: 1, price: 10, currency: 'USD', name: 'X' }]),
    ).rejects.toThrow(HttpException);
  });

  it('validateCartItems – succeeds and returns enriched items', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'p1',
      name: 'Prod 1',
      price: 10,
      salePrice: null,
      stock: 5,
      currency: 'USD',
    });
    const items = await service.validateCartItems('t-uuid', [
      { productId: 'p1', quantity: 2, price: 10, currency: 'USD', name: 'X' },
    ]);
    expect(items[0]).toMatchObject({ name: 'Prod 1', price: 10 });
  });

  it('createOrder – creates order and logs audit', async () => {
    // mock product stock update
    mockPrisma.product.update.mockResolvedValueOnce({});

    mockPrisma.order.create.mockResolvedValueOnce({
      id: 'order-1',
      orderNumber: 'ORD-123',
      totalAmount: 20,
      currency: 'USD',
      items: [],
    });

    const result = await service.createOrder(
      't-uuid',
      [{ productId: 'p1', quantity: 2, price: 10, currency: 'USD', name: 'X' }],
      { name: 'Ali', email: 'ali@example.com', phone: '+201111111111' },
      { street: 'S', city: 'C', country: 'EG', postalCode: '12345' },
      'CARD',
      '1.2.3.4',
    );

    expect(result).toMatchObject({ id: 'order-1', orderNumber: 'ORD-123' });
    expect(mockPrisma.order.create).toHaveBeenCalled();
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });
});
