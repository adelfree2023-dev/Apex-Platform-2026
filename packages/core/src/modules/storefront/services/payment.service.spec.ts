import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RateLimiterService } from '../../../common/access-control/services/rate-limiter.service';
import { EncryptionService } from '../../../common/security/encryption/encryption.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';

jest.mock('stripe');
jest.mock('crypto', () => ({
  randomBytes: () => ({ toString: () => 'test_secret_key' }),
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let stripeMock: any;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    order: {
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    tenant: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
  };
  const mockRateLimiter = {
    checkLimit: jest.fn().mockResolvedValue({ allowed: true })
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
  const mockConfig = {
    get: jest.fn((key) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_dummy';
      if (key === 'NODE_ENV') return 'development';
      return null;
    })
  };

  beforeAll(() => {
    stripeMock = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({
          id: 'pi_123',
          client_secret: 'client_secret_test',
          amount: 15000,
          currency: 'usd'
        }),
      },
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_123' } },
          id: 'evt_123'
        }),
      },
      refunds: {
        create: jest.fn().mockResolvedValue({
          id: 're_123',
          amount: 5000,
          currency: 'usd',
          status: 'succeeded'
        }),
      },
    };
    (Stripe as any).mockImplementation(() => stripeMock);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: AuditService, useValue: mockAudit },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('checkRateLimit', () => {
    it('should not throw when within limits', async () => {
      await expect(service.checkRateLimit('tenant-1', '1.2.3.4')).resolves.not.toThrow();
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        'payment:tenant-1:1.2.3.4',
        { maxRequests: 10, windowMs: 60000 }
      );
    });

    it('should throw when limit exceeded', async () => {
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        currentRequests: 11,
        maxRequests: 10
      });

      await expect(service.checkRateLimit('tenant-1', '1.2.3.4')).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PAYMENT_RATE_LIMIT_EXCEEDED',
        expect.objectContaining({
          severity: 'HIGH',
          sourceIp: '1.2.3.4'
        })
      );
    });
  });

  describe('createPaymentIntent', () => {
    const validDto: CreatePaymentIntentDto = {
      tenantId: 'tenant-1',
      orderId: 'order-uuid',
      amount: 150,
      currency: 'USD',
      paymentMethod: 'CARD',
      customerEmail: 'customer@example.com'
    };
    const ipAddress = '1.2.3.4';

    it('should create payment intent successfully', async () => {
      const result = await service.createPaymentIntent(validDto, ipAddress);

      expect(result).toEqual({
        clientSecret: 'client_secret_test',
        paymentId: 'pi_123'
      });
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
        amount: 15000,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          tenantId: 'tenant-1',
          orderId: 'order-uuid',
          ipAddress: '1.2.3.4'
        },
        automatic_payment_methods: { enabled: true }
      });
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          orderId: 'order-uuid',
          paymentId: 'pi_123',
          amount: 150,
          currency: 'USD',
          status: 'CREATED',
          paymentMethod: 'CARD',
          ipAddress: '1.2.3.4'
        })
      });
    });

    it('should reject invalid amounts', async () => {
      const invalidDto = { ...validDto, amount: 50 }; // Less than minimum
      await expect(service.createPaymentIntent(invalidDto, ipAddress)).rejects.toThrow(HttpException);

      const tooHighDto = { ...validDto, amount: 200000 }; // More than maximum
      await expect(service.createPaymentIntent(tooHighDto, ipAddress)).rejects.toThrow(HttpException);
    });

    it('should handle Stripe API errors', async () => {
      stripeMock.paymentIntents.create.mockRejectedValueOnce(new Error('Stripe API error'));

      await expect(service.createPaymentIntent(validDto, ipAddress)).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PAYMENT_INTENT_CREATION_FAILED',
        expect.objectContaining({
          severity: 'HIGH',
          details: expect.objectContaining({
            tenantId: 'tenant-1',
            amount: 150
          })
        })
      );
    });
  });

  describe('validateWebhookSignature', () => {
    const validEvent = { type: 'payment_intent.succeeded' } as ProcessWebhookDto;
    const rawBody = Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' }));

    it('should throw when signature missing', async () => {
      await expect(service.validateWebhookSignature(validEvent, undefined, rawBody))
        .rejects.toThrow(HttpException);
    });

    it('should verify signature successfully', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
        if (key === 'NODE_ENV') return 'production';
        return null;
      });

      await service.validateWebhookSignature(validEvent, 'valid_sig', rawBody);
      expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        'valid_sig',
        'whsec_test'
      );
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'WEBHOOK_SIGNATURE_VERIFIED',
          details: expect.objectContaining({ eventType: 'payment_intent.succeeded' })
        })
      );
    });

    it('should handle invalid signature', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
        if (key === 'NODE_ENV') return 'production';
        return null;
      });

      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.validateWebhookSignature(validEvent, 'invalid_sig', rawBody))
        .rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'INVALID_WEBHOOK_SIGNATURE',
        expect.objectContaining({
          severity: 'CRITICAL',
          details: expect.objectContaining({ eventType: 'payment_intent.succeeded' })
        })
      );
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle payment succeeded event', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
        id: 'evt_123'
      };

      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        tenantId: 'tenant-1',
        orderId: 'order-1',
        amount: 150,
        status: 'CREATED'
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'PAID',
        paidAt: new Date()
      });

      await service.handleWebhookEvent(event as any, '1.2.3.4');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          status: 'SUCCEEDED'
        })
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'PAID'
        })
      });
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'PAYMENT_SUCCEEDED'
        })
      );
    });
  });

  describe('confirmPayment', () => {
    const validCheckout: CheckoutDto = {
      tenantId: 'tenant-1',
      items: [
        { productId: 'p1', quantity: 1, price: 100, currency: 'USD', name: 'Product' }
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
      paymentMethod: 'CARD'
    };

    it('should confirm payment successfully', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        items: [],
        tenantId: 'tenant-1'
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
        paymentMethod: 'CARD',
        paymentDetails: {}
      });

      const result = await service.confirmPayment(validCheckout, '1.2.3.4');

      expect(result).toMatchObject({
        id: 'order-1',
        status: 'CONFIRMED'
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          paymentMethod: 'CARD'
        })
      });
    });

    it('should reject if order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(service.confirmPayment(validCheckout, '1.2.3.4'))
        .rejects.toThrow(HttpException);
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send email confirmation successfully', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        storeName: 'My Store',
        supportEmail: 'support@my-store.com'
      });

      await service.sendPaymentConfirmation({
        id: 'order-1',
        orderNumber: 'ORD-123',
        totalAmount: 150,
        currency: 'USD',
        items: [],
        paymentDetails: {
          customerInfo: 'encrypted:{"email":"customer@example.com","name":"Customer"}'
        }
      } as any, 'tenant-1');

      expect(mockMail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'تأكيد الدفع #ORD-123 - My Store'
        })
      );
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'PAYMENT_CONFIRMATION_SENT'
        })
      );
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PAID',
        totalAmount: 150,
        currency: 'USD',
        tenantId: 'tenant-1',
        payment: {
          paymentId: 'pi_123'
        },
        tenant: {
          id: 'tenant-1'
        }
      });

      const result = await service.refundPayment(
        'order-1',
        50,
        'Customer request',
        '1.2.3.4'
      );

      expect(result).toMatchObject({
        id: 're_123',
        amount: 50,
        currency: 'usd',
        status: 'succeeded'
      });
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 5000,
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          orderId: 'order-1',
          refundedBy: 'admin'
        })
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'REFUNDED'
        })
      });
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'PAYMENT_REFUNDED'
        })
      );
    });

    it('should reject refund for non-paid orders', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
        tenantId: 'tenant-1'
      });

      await expect(service.refundPayment('order-1', 50, 'Reason'))
        .rejects.toThrow(HttpException);
    });

    it('should reject refund exceeding order amount', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PAID',
        totalAmount: 100,
        tenantId: 'tenant-1'
      });

      await expect(service.refundPayment('order-1', 150, 'Reason'))
        .rejects.toThrow(HttpException);
    });
  });
});
