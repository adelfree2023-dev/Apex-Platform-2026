import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  const mockPaymentService = {
    checkRateLimit: jest.fn(),
    createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'sec', paymentId: 'pid' }),
    validateWebhookSignature: jest.fn(),
    handleWebhookEvent: jest.fn(),
    confirmPayment: jest.fn().mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-123',
      totalAmount: 100,
      currency: 'USD',
      status: 'PAID',
      items: [],
    }),
    sendPaymentConfirmation: jest.fn(),
    refundPayment: jest.fn().mockResolvedValue({ success: true, refundId: 'ref-1' }),
  };
  const mockAudit = { logActivity: jest.fn(), logSecurityEvent: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
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
  const ip = '1.2.3.4';

  it('POST create-intent – success', async () => {
    const payload: CreatePaymentIntentDto = {
      tenantId: tenant,
      orderId: 'order-uuid',
      amount: 150,
      currency: 'USD',
      paymentMethod: 'CARD',
    };
    await request(app.getHttpServer())
      .post(`/api/shop/${tenant}/payments/create-intent`)
      .send(payload)
      .set('X-Forwarded-For', ip)
      .expect(HttpStatus.CREATED)
      .expect({ clientSecret: 'sec', paymentId: 'pid' });

    expect(mockPaymentService.checkRateLimit).toHaveBeenCalledWith(tenant, ip);
    expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(payload, ip);
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });

  it('POST webhook – signature verification failure → 400', async () => {
    mockPaymentService.validateWebhookSignature.mockRejectedValueOnce(
      new HttpException('Bad sig', HttpStatus.BAD_REQUEST),
    );
    const webhook: ProcessWebhookDto = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    };
    await request(app.getHttpServer())
      .post(`/api/shop/${tenant}/payments/webhook`)
      .send(webhook)
      .set('stripe-signature', 'invalid')
      .expect(HttpStatus.BAD_REQUEST);
    expect(mockAudit.logSecurityEvent).toHaveBeenCalled();
  });

  it('POST confirm – success', async () => {
    const checkout: CheckoutDto = {
      items: [],
      customerInfo: { name: 'Ali', email: 'ali@example.com', phone: '+201234567890' },
      shippingAddress: {
        street: '123 St',
        city: 'Cairo',
        country: 'EG',
        postalCode: '12345',
      },
      paymentMethod: 'CARD',
    };
    await request(app.getHttpServer())
      .post(`/api/shop/${tenant}/payments/confirm`)
      .send(checkout)
      .set('X-Forwarded-For', ip)
      .expect(HttpStatus.OK)
      .expect(expect.objectContaining({ id: 'order-1', status: 'PAID' }));

    expect(mockPaymentService.confirmPayment).toHaveBeenCalledWith(checkout, ip);
    expect(mockPaymentService.sendPaymentConfirmation).toHaveBeenCalled();
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });

  it('POST refund – success', async () => {
    const body = { orderId: 'order-1', amount: 50, reason: 'Customer request' };
    await request(app.getHttpServer())
      .post(`/api/shop/${tenant}/payments/refund`)
      .send(body)
      .set('X-Forwarded-For', ip)
      .expect(HttpStatus.OK)
      .expect({ success: true, refundId: 'ref-1' });

    expect(mockPaymentService.refundPayment).toHaveBeenCalledWith(
      'order-1',
      50,
      'Customer request',
      ip,
    );
    expect(mockAudit.logActivity).toHaveBeenCalled();
  });
});
