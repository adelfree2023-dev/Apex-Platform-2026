/**
 * Payments Controller Unit Tests
 * Covers: Payment methods, processing, confirmation, Stripe integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { PaymentsController, StripeWebhookController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentGatewayService } from './payment-gateway.service';

describe('PaymentsController', () => {
    let controller: PaymentsController;

    const mockPaymentsService = {
        createPaymentIntent: jest.fn(),
        getPaymentStatus: jest.fn(),
        handleWebhook: jest.fn(),
    };

    const mockPaymentGatewayService = {
        getSupportedMethods: jest.fn(),
        processPayment: jest.fn(),
        confirmPayment: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [
                { provide: PaymentsService, useValue: mockPaymentsService },
                { provide: PaymentGatewayService, useValue: mockPaymentGatewayService },
            ],
        }).compile();

        controller = module.get<PaymentsController>(PaymentsController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== PAYMENT METHODS ====================

    describe('getSupportedMethods', () => {
        it('should return supported payment methods', async () => {
            mockPaymentGatewayService.getSupportedMethods.mockReturnValue([
                'stripe', 'cod', 'bank_transfer', 'fawry', 'vodafone_cash'
            ]);

            const result = await controller.getSupportedMethods('test-store');

            expect(result.success).toBe(true);
            expect(result.methods).toContain('stripe');
            expect(result.methods).toContain('cod');
            expect(result.currency).toBe('egp');
        });
    });

    // ==================== PROCESS PAYMENT ====================

    describe('processPayment', () => {
        it('should process payment successfully', async () => {
            mockPaymentGatewayService.processPayment.mockResolvedValue({
                paymentId: 'pay_123',
                status: 'confirmed',
            });

            const result = await controller.processPayment('test-store', {
                orderId: 1,
                method: 'cod',
            });

            expect(result.success).toBe(true);
            expect(result.paymentId).toBe('pay_123');
        });

        it('should throw without orderId', async () => {
            await expect(controller.processPayment('test-store', {
                orderId: undefined as any,
                method: 'cod',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without method', async () => {
            await expect(controller.processPayment('test-store', {
                orderId: 1,
                method: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== CONFIRM PAYMENT ====================

    describe('confirmPayment', () => {
        it('should confirm COD payment', async () => {
            mockPaymentGatewayService.confirmPayment.mockResolvedValue({
                success: true,
                status: 'confirmed',
            });

            const result = await controller.confirmPayment('test-store', { orderId: 1 });

            expect(result.success).toBe(true);
        });
    });

    // ==================== CREATE PAYMENT INTENT ====================

    describe('createPaymentIntent', () => {
        it('should create Stripe payment intent', async () => {
            mockPaymentsService.createPaymentIntent.mockResolvedValue({
                id: 'pi_123',
                client_secret: 'pi_123_secret_456',
                amount: 15000,
                currency: 'egp',
            });

            const result = await controller.createPaymentIntent('test-store', {
                orderId: 1,
            });

            expect(result.success).toBe(true);
            expect(result.clientSecret).toBe('pi_123_secret_456');
            expect(result.paymentIntentId).toBe('pi_123');
        });

        it('should throw without orderId', async () => {
            await expect(controller.createPaymentIntent('test-store', {
                orderId: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== GET PAYMENT STATUS ====================

    describe('getPaymentStatus', () => {
        it('should return payment status', async () => {
            mockPaymentsService.getPaymentStatus.mockResolvedValue({
                status: 'succeeded',
                amount: 15000,
            });

            const result = await controller.getPaymentStatus('test-store', 'pi_123');

            expect(result.success).toBe(true);
            expect(result.status).toBe('succeeded');
        });

        it('should handle errors', async () => {
            mockPaymentsService.getPaymentStatus.mockRejectedValue(new Error('Not found'));

            await expect(controller.getPaymentStatus('test-store', 'invalid'))
                .rejects.toThrow(HttpException);
        });
    });
});

// ==================== WEBHOOK CONTROLLER ====================

describe('StripeWebhookController', () => {
    let controller: StripeWebhookController;

    const mockPaymentsService = {
        handleWebhook: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StripeWebhookController],
            providers: [
                { provide: PaymentsService, useValue: mockPaymentsService },
            ],
        }).compile();

        controller = module.get<StripeWebhookController>(StripeWebhookController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleWebhook', () => {
        it('should process valid webhook', async () => {
            mockPaymentsService.handleWebhook.mockResolvedValue({ received: true });

            const mockReq = {
                rawBody: Buffer.from('{}'),
                headers: { 'stripe-signature': 'sig_123' },
            } as any;

            const result = await controller.handleWebhook(mockReq);

            expect(result.received).toBe(true);
        });

        it('should throw without signature', async () => {
            const mockReq = {
                rawBody: Buffer.from('{}'),
                headers: {},
            } as any;

            await expect(controller.handleWebhook(mockReq))
                .rejects.toThrow(HttpException);
        });
    });
});
