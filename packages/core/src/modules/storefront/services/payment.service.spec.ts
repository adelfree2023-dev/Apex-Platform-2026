import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RateLimiterService } from '../../../common/access-control/services/rate-limiter.service';
import { EncryptedFieldService as EncryptionService } from '../../../common/security/encryption/encrypted-field.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';

jest.mock('stripe');
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn().mockImplementation((size) => actual.randomBytes(size)),
  };
});

describe('PaymentService', () => {
  let service: PaymentService;
  let stripeMock: any;

  const mockPrisma: any = {
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
    decryptSensitiveData: jest.fn((data) => data?.replace('encrypted:', '') || data),
    encrypt: jest.fn((_, data) => `encrypted:${data}`),
    decrypt: jest.fn((_, data) => data?.replace('encrypted:', '') || data),
  };
  const mockAudit = {
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn()
  };
  const mockMail = {
    sendMail: jest.fn().mockResolvedValue(undefined)
  };
  const mockConfig = {
    get: jest.fn().mockImplementation((key) => {
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
    });

    it('should throw when limit exceeded', async () => {
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        currentRequests: 11,
        maxRequests: 10
      });

      await expect(service.checkRateLimit('tenant-1', '1.2.3.4')).rejects.toThrow(HttpException);
    });
  });

  describe('createPaymentIntent', () => {
    const validDto: CreatePaymentIntentDto = {
      tenantId: 'tenant-1',
      orderId: 'order-uuid',
      amount: 150,
      currency: 'USD',
      paymentMethod: 'CREDIT_CARD',
      customerEmail: 'customer@example.com'
    };
    const ipAddress = '1.2.3.4';

    it('should create payment intent successfully', async () => {
      const result = await service.createPaymentIntent(validDto, ipAddress);
      expect(result.paymentId).toBe('pi_123');
    });

    it('should reject invalid amounts', async () => {
      const invalidDto = { ...validDto, amount: 50 };
      await expect(service.createPaymentIntent(invalidDto, ipAddress)).rejects.toThrow(HttpException);

      const tooHighDto = { ...validDto, amount: 20000000 }; // > 10,000,000
      await expect(service.createPaymentIntent(tooHighDto, ipAddress)).rejects.toThrow(HttpException);
    });

    it('should log security event and throw on Stripe error', async () => {
      stripeMock.paymentIntents.create.mockRejectedValueOnce(new Error('Stripe API Down'));
      await expect(service.createPaymentIntent(validDto, ipAddress)).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('PAYMENT_INTENT_CREATION_FAILED', expect.any(Object));
    });
  });

  describe('validateWebhookSignature', () => {
    it('should throw if signature is missing', async () => {
      await expect(service.validateWebhookSignature({} as any, undefined, Buffer.from(''))).rejects.toThrow(HttpException);
    });

    it('should validate signature successfully in dev', async () => {
      mockConfig.get.mockImplementation((key) => key === 'NODE_ENV' ? 'development' : null);
      await expect(service.validateWebhookSignature({} as any, 'sig', Buffer.from(''))).resolves.not.toThrow();
    });

    it('should throw if secret is missing in production', async () => {
      mockConfig.get.mockImplementation((key) => key === 'NODE_ENV' ? 'production' : null);
      await expect(service.validateWebhookSignature({} as any, 'sig', Buffer.from(''))).rejects.toThrow(HttpException);
    });

    it('should validate signature using Stripe in prod', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
        return null;
      });
      await expect(service.validateWebhookSignature({} as any, 'sig', Buffer.from(''))).resolves.not.toThrow();
      expect(stripeMock.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should log security event and throw on invalid signature', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
        return null;
      });
      stripeMock.webhooks.constructEvent.mockImplementationOnce(() => { throw new Error('Invalid sig'); });
      await expect(service.validateWebhookSignature({} as any, 'sig', Buffer.from(''))).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('INVALID_WEBHOOK_SIGNATURE', expect.any(Object));
    });
  });

  describe('handleWebhookEvent', () => {
    it('should dispatch succeeded event', async () => {
      const spy = jest.spyOn(service as any, 'handlePaymentSuccess').mockResolvedValue(undefined);
      await service.handleWebhookEvent({ type: 'payment_intent.succeeded' } as any, '1.2.3.4');
      expect(spy).toHaveBeenCalled();
    });

    it('should log unhandled event types', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      await service.handleWebhookEvent({ type: 'unknown' } as any, '1.2.3.4');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled event type: unknown'));
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should update payment and order on success', async () => {
      const payment = { id: 'p1', paymentId: 'pi_123', orderId: 'o1', tenantId: 't1', amount: 100, paymentMethod: 'CARD', metadata: {} };
      mockPrisma.payment.findFirst.mockResolvedValue(payment);

      const event = { id: 'evt_1', type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } };
      await (service as any).handlePaymentSuccess(event, '1.2.3.4');

      expect(mockPrisma.payment.update).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'o1' },
        data: expect.objectContaining({ status: 'PAID' })
      }));
      expect(mockAudit.logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_SUCCEEDED' }));
    });

    it('should warn if payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      await (service as any).handlePaymentSuccess({ data: { object: { id: 'pi_none' } } }, '1.2.3.4');
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('confirmPayment', () => {
    const validCheckout: CheckoutDto = {
      tenantId: 'tenant-1',
      items: [],
      customerInfo: { name: 'A', email: 'a@a.com', phone: '1' },
      shippingAddress: { street: 's', city: 'c', country: 'C', postalCode: '1' },
      paymentMethod: 'CREDIT_CARD'
    };

    it('should confirm payment successfully', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: 'PENDING', items: [], tenantId: 't1' });
      mockPrisma.order.update.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });

      const result = await service.confirmPayment(validCheckout, '1.2.3.4');
      expect(result.status).toBe('CONFIRMED');
    });

    it('should throw if order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(service.confirmPayment(validCheckout, '1.2.3.4')).rejects.toThrow(HttpException);
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send email confirmation successfully', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'My Store' });

      const order = {
        id: 'o1',
        orderNumber: 'ORD-123',
        totalAmount: 150,
        currency: 'USD',
        items: [],
        paymentDetails: {
          customerInfo: 'encrypted:{"email":"customer@example.com","name":"Customer"}'
        }
      };

      await service.sendPaymentConfirmation(order, 't1');

      expect(mockMail.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: expect.stringContaining('ORD-123'),
        })
      );
    });

    it('should handle missing tenant gracefully', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      await service.sendPaymentConfirmation({}, 't-none');
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle decryption failure gracefully', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'S' });
      mockEncryption.decrypt.mockImplementationOnce(() => { throw new Error('Fail'); });
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.sendPaymentConfirmation({ paymentDetails: { customerInfo: 'bad' } }, 't1');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to decrypt customer info'));
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'o1', status: 'PAID', totalAmount: 100, currency: 'USD', tenantId: 't1',
        payment: { paymentId: 'pi_123' }, tenant: { id: 't1' }
      });

      await service.refundPayment('o1', 50, 'duplicate', '1.2.3.4');

      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 5000,
        reason: 'duplicate',
        metadata: expect.objectContaining({ orderId: 'o1' })
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REFUNDED' }) }));
    });

    it('should throw if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.refundPayment('o1', 50)).rejects.toThrow(HttpException);
    });

    it('should throw if order not paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'PENDING' });
      await expect(service.refundPayment('o1', 50)).rejects.toThrow(HttpException);
    });

    it('should throw if amount too high', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'PAID', totalAmount: 100 });
      await expect(service.refundPayment('o1', 150)).rejects.toThrow(HttpException);
    });

    it('should throw if Stripe refund fails', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'o1', status: 'PAID', totalAmount: 100, payment: { paymentId: 'pi_1' }
      });
      stripeMock.refunds.create.mockRejectedValueOnce(new Error('Stripe Fail'));
      await expect(service.refundPayment('o1', 50)).rejects.toThrow(HttpException);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('REFUND_FAILED', expect.any(Object));
    });
  });
});
