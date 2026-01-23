import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RateLimiterService } from '../../../common/security/rate-limiter/rate-limiter.service';
import { EncryptionService } from '../../../common/security/encryption/encryption.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { MailService } from '../../../common/communication/mail.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { CheckoutDto } from '../dto/checkout.dto';

jest.mock('stripe');

describe('PaymentService', () => {
  let service: PaymentService;
  const mockPrisma = {
    payment: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    order: { update: jest.fn() },
    tenant: { findUnique: jest.fn() },
  };
  const mockRateLimiter = { checkLimit: jest.fn().mockResolvedValue({ allowed: true }) };
  const mockEncryption = { encryptSensitiveData: jest.fn().mockReturnValue('enc') };
  const mockAudit = { logActivity: jest.fn(), logSecurityEvent: jest.fn() };
  const mockMail = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  const mockConfig = { get: jest.fn().mockReturnValue('sk_test_dummy') };

  const stripeMock = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret',
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({ type: 'payment_intent.succeeded', data: { object: {} } }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_123' }),
    },
  };

  beforeAll(() => {
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

  it('checkRateLimit – throws when limit exceeded', async () => {
    mockRateLimiter.checkLimit.mockResolvedValueOnce({ allowed: false, currentRequests: 11, maxRequests: 10 });
    await expect(service.checkRateLimit('tenant-1', '1.2.3.4')).rejects.toThrow(HttpException);
    expect(mockAudit.logSecurityEvent).toHaveBeenCalled();
  });

  it('createPaymentIntent – returns clientSecret & id', async () => {
    const dto: CreatePaymentIntentDto = {
      tenantId: 'tenant-1',
      orderId: 'order-uuid',
      amount: 150,
      currency: 'USD',
      paymentMethod: 'CARD',
    };
    const result = await service.createPaymentIntent(dto, '1.2.3.4');
    expect(result).toEqual({ clientSecret: 'secret', paymentId: 'pi_123' });
    expect(stripeMock.paymentIntents.create).toHaveBeenCalled();
    expect(mockPrisma.payment.create).toHaveBeenCalled();
  });

  it('validateWebhookSignature – fails when missing signature', async () => {
    await expect(
      service.validateWebhookSignature({} as any, undefined, Buffer.from('')),
    ).rejects.toThrow(HttpException);
  });

  it('handleWebhookEvent – delegates to right handler', async () => {
    const webhookDto = { type: 'payment_intent.succeeded', data: { object: {} } } as any;
    const spySuccess = jest.spyOn(service as any, 'handlePaymentSuccess').mockResolvedValue(undefined);
    await service.handleWebhookEvent(webhookDto, '1.2.3.4');
    expect(spySuccess).toHaveBeenCalled();
  });

  it('confirmPayment – updates order and returns order object', async () => {
    const checkout: CheckoutDto = {
      items: [],
      customerInfo: { name: 'Ali', email: 'ali@example.com', phone: '+201111111111' },
      shippingAddress: { street: 'St', city: 'C', country: 'EG', postalCode: '12345' },
      paymentMethod: 'CARD',
    };
    mockPrisma.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      status: 'PENDING',
      items: [],
    });
    mockPrisma.order.update.mockResolvedValueOnce({
      id: 'order-1',
      status: 'CONFIRMED',
      paymentMethod: 'CARD',
      paymentDetails: {},
    });

    const result = await service.confirmPayment(checkout, '1.2.3.4');
    expect(result).toMatchObject({ id: 'order-1', status: 'CONFIRMED' });
    expect(mockPrisma.order.update).toHaveBeenCalled();
  });

  it('refundPayment – succeeds and updates order status', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      status: 'PAID',
      totalAmount: 200,
      payment: { paymentId: 'pi_123' },
      tenant: { id: 'tenant-1' },
    });
    const refund = await service.refundPayment('order-1', 50, 'User request', '1.2.3.4');
    expect(refund).toMatchObject({ id: 're_123', amount: 50 });
    expect(stripeMock.refunds.create).toHaveBeenCalled();
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });
});
