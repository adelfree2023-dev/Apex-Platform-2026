import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ProcessWebhookDto } from '../dto/process-webhook.dto';
import { CheckoutDto } from '../dto/checkout.dto';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getCommonProviders } from '../../../../test/test-utils';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let mockPaymentService: any;
  let mockAudit: any;

  beforeAll(async () => {
    mockPaymentService = {
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
      refundPayment: jest.fn().mockResolvedValue({ success: true, refundId: 'ref-1', tenantId: 't-uuid', id: 'r-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        ...getCommonProviders(),
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    mockAudit = module.get<AuditService>(AuditService);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const tenant = 'demo';
  const ip = '127.0.0.1';

  describe('POST /create-intent', () => {
    it('should create payment intent successfully', async () => {
      const payload: CreatePaymentIntentDto = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        orderId: '00000000-0000-0000-0000-000000000002',
        amount: 150,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
        customerEmail: 'customer@example.com'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/create-intent`)
        .send(payload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ clientSecret: 'sec', paymentId: 'pid' });
      expect(mockPaymentService.checkRateLimit).toHaveBeenCalled();
    });

    it('should reject when rate limit exceeded', async () => {
      mockPaymentService.checkRateLimit.mockRejectedValueOnce(
        new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS)
      );

      const payload: CreatePaymentIntentDto = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        orderId: '00000000-0000-0000-0000-000000000002',
        amount: 150,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
      } as any;

      await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/create-intent`)
        .send(payload)
        .expect(HttpStatus.TOO_MANY_REQUESTS);
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

      expect(mockPaymentService.handleWebhookEvent).toHaveBeenCalled();
    });
  });

  describe('POST /confirm', () => {
    it('should confirm payment successfully', async () => {
      const checkout: CheckoutDto = {
        tenantId: '00000000-0000-0000-0000-000000000001',
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
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: 'order-1',
        orderNumber: 'ORD-123',
        status: 'PAID'
      });
    });
  });

  describe('POST /refund', () => {
    it('should process refund successfully', async () => {
      const body = {
        orderId: '00000000-0000-0000-0000-000000000002',
        amount: 50,
        reason: 'Customer request'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenant}/payments/refund`)
        .send(body)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ success: true, refundId: 'r-1' });
    });
  });
});
