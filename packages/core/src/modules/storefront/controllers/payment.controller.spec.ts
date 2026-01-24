import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

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
      shippingAddress: {},
      customerInfo: {},
    }),
    sendPaymentConfirmation: jest.fn(),
    refundPayment: jest.fn().mockResolvedValue({ success: true, refundId: 'ref-1' }),
  };
  const mockAudit = {
    logActivity: jest.fn(),
    logSecurityEvent: jest.fn()
  };

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

  describe('POST /create-intent', () => {
    it('should create payment intent successfully', async () => {
      const payload: CreatePaymentIntentDto = {
        tenantId: tenant,
        orderId: 'order-uuid',
        amount: 150,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
        customerEmail: 'customer@example.com'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/create-intent`)
        .send(payload)
        .set('X-Forwarded-For', ip)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ clientSecret: 'sec', paymentId: 'pid' });
      expect(mockPaymentService.checkRateLimit).toHaveBeenCalledWith(tenant, ip);
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(payload, ip);
      expect(mockAudit.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: tenant,
          action: 'PAYMENT_INTENT_CREATED'
        })
      );
    });

    it('should reject invalid amount', async () => {
      const invalidPayload = {
        tenantId: tenant,
        orderId: 'order-uuid',
        amount: 50, // Below minimum
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
      };

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/create-intent`)
        .send(invalidPayload)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject when rate limit exceeded', async () => {
      mockPaymentService.checkRateLimit.mockRejectedValueOnce(
        new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS)
      );

      const payload: CreatePaymentIntentDto = {
        tenantId: tenant,
        orderId: 'order-uuid',
        amount: 150,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
      } as any;

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/create-intent`)
        .send(payload)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PAYMENT_RATE_LIMIT_EXCEEDED',
        expect.objectContaining({ tenantId: tenant })
      );
    });
  });

  describe('POST /webhook', () => {
    it('should process webhook successfully', async () => {
      const webhook: ProcessWebhookDto = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
        id: 'evt_123'
      } as any;

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/webhook`)
        .send(webhook)
        .set('stripe-signature', 'valid_sig')
        .expect(HttpStatus.OK)
        .expect({ received: true });

      expect(mockPaymentService.validateWebhookSignature).toHaveBeenCalledWith(
        webhook,
        'valid_sig',
        expect.any(Buffer)
      );
      expect(mockPaymentService.handleWebhookEvent).toHaveBeenCalledWith(webhook, ip);
      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PAYMENT_WEBHOOK_PROCESSED',
        expect.objectContaining({ webhookType: 'payment_intent.succeeded' })
      );
    });

    it('should reject invalid signature', async () => {
      mockPaymentService.validateWebhookSignature.mockRejectedValueOnce(
        new HttpException('Bad signature', HttpStatus.BAD_REQUEST)
      );

      const webhook: ProcessWebhookDto = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
        id: 'evt_123'
      } as any;

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/webhook`)
        .send(webhook)
        .set('stripe-signature', 'invalid')
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'INVALID_WEBHOOK_ATTEMPT',
        expect.objectContaining({ signature: 'invalid' })
      );
    });
  });

  describe('POST /confirm', () => {
    it('should confirm payment successfully', async () => {
      const checkout: CheckoutDto = {
        tenantId: tenant,
        items: [
          { productId: 'p1', quantity: 2, price: 50, currency: 'USD', name: 'Product' }
        ],
        customerInfo: {
          name: 'Ali',
          email: 'ali@example.com',
          phone: '+201234567890'
        },
        shippingAddress: {
          street: '123 Main St',
          city: 'Cairo',
          country: 'Egypt',
          postalCode: '12345'
        },
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/confirm`)
        .send(checkout)
        .set('X-Forwarded-For', ip)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: 'order-1',
        orderNumber: 'ORD-123',
        totalAmount: 100,
        status: 'PAID'
      });
      expect(mockPaymentService.confirmPayment).toHaveBeenCalledWith(checkout, ip);
      expect(mockPaymentService.sendPaymentConfirmation).toHaveBeenCalled();
    });

    it('should reject invalid checkout data', async () => {
      const invalidCheckout = {
        items: [],
        customerInfo: { name: '' },
        shippingAddress: {},
        paymentMethod: 'INVALID'
      };

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/confirm`)
        .send(invalidCheckout)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith(
        'PAYMENT_CONFIRMATION_FAILED',
        expect.objectContaining({ error: expect.stringContaining('Invalid') })
      );
    });
  });

  describe('POST /refund', () => {
    it('should process refund successfully', async () => {
      const body = {
        orderId: 'order-1',
        amount: 50,
        reason: 'Customer request'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/refund`)
        .send(body)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ success: true, refundId: 'ref-1' });
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith(
        'order-1',
        50,
        'Customer request',
        expect.any(String)
      );
    });

    it('should reject refund for non-existent order', async () => {
      mockPaymentService.refundPayment.mockRejectedValueOnce(
        new HttpException('Order not found', HttpStatus.NOT_FOUND)
      );

      const body = { orderId: 'non-existent', amount: 50, reason: 'Test' };

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/refund`)
        .send(body)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
