import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getCommonProviders, createMockPrisma } from '../../../../test/test-utils';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let mockPaymentService: any;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPaymentService = {
      checkRateLimit: jest.fn(),
      createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'sec', paymentId: 'pid' }),
      validateWebhookSignature: jest.fn(),
      handleWebhookEvent: jest.fn(),
      confirmPayment: jest.fn().mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-123',
        status: 'PAID',
        totalAmount: 100,
        currency: 'USD'
      }),
      sendPaymentConfirmation: jest.fn(),
      refundPayment: jest.fn().mockResolvedValue({ success: true, refundId: 'r-1', tenantId: 't1', id: 'r-1' }),
    };

    mockPrisma = createMockPrisma();
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE'
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        ...getCommonProviders(),
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = module.createNestApplication();

    // 🛡️ S2: Middleware to inject mock tenant
    app.use((req: any, res: any, next: any) => {
      req.tenant = { id: '00000000-0000-0000-0000-000000000001' };
      req.tenantId = '00000000-0000-0000-0000-000000000001';
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const tenantSub = 'demo';
  const validTenantId = '00000000-0000-0000-0000-000000000001';

  describe('POST /confirm', () => {
    it('should confirm payment successfully', async () => {
      const checkout: CheckoutDto = {
        tenantId: validTenantId,
        items: [],
        customerInfo: { name: 'A', email: 'a@a.com', phone: '1' },
        shippingAddress: { street: 's', city: 'c', country: 'C', postalCode: '1' },
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenantSub}/payments/confirm`)
        .set('x-tenant-id', validTenantId)
        .send(checkout)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({ id: 'order-1' });
    });
  });

  describe('POST /create-intent', () => {
    it('should create intent successfully', async () => {
      const dto = {
        tenantId: validTenantId,
        orderId: 'o1',
        amount: 150,
        currency: 'USD',
        paymentMethod: 'CARD'
      };

      await request(app.getHttpServer())
        .post(`/api/shop/${tenantSub}/payments/create-intent`)
        .send(dto)
        .expect(HttpStatus.CREATED);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalled();
    });
  });

  describe('POST /webhook', () => {
    it('should process webhook successfully', async () => {
      const body = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } };
      await request(app.getHttpServer())
        .post(`/api/shop/${tenantSub}/payments/webhook`)
        .set('stripe-signature', 'sig')
        .send(body)
        .expect(HttpStatus.CREATED);

      expect(mockPaymentService.validateWebhookSignature).toHaveBeenCalled();
    });
  });

  describe('POST /refund', () => {
    it('should process refund successfully', async () => {
      const body = { orderId: '00000000-0000-0000-0000-000000000001', amount: 50, reason: 'test' };
      await request(app.getHttpServer())
        .post(`/api/shop/${tenantSub}/payments/refund`)
        .send(body)
        .expect(HttpStatus.CREATED);

      expect(mockPaymentService.refundPayment).toHaveBeenCalled();
    });
  });
});
