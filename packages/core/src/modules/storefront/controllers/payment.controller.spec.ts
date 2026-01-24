import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
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
        status: 'PAID'
      }),
      sendPaymentConfirmation: jest.fn(),
      refundPayment: jest.fn().mockResolvedValue({ success: true, refundId: 'r-1' }),
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

  describe('POST /refund', () => {
    it('should process refund successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/shop/${tenantSub}/payments/refund`)
        .set('x-tenant-id', validTenantId)
        .send({ orderId: 'o1', amount: 10 })
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ success: true, refundId: 'r-1' });
    });
  });
});
