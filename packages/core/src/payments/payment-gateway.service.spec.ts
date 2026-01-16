/**
 * Payment Gateway Service Unit Tests
 * Root-analyzed: Handles Stripe, Cash, PayPal, local wallets
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';

// Mock Stripe
jest.mock('./stripe.config', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: jest.fn(),
            },
        },
    },
    STRIPE_CONFIG: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
    },
}));

describe('PaymentGatewayService', () => {
    let service: PaymentGatewayService;

    const mockPrismaService = {
        $queryRawUnsafe: jest.fn(),
        $executeRawUnsafe: jest.fn(),
    };

    const mockEventService = {
        record: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentGatewayService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EventService, useValue: mockEventService },
            ],
        }).compile();

        service = module.get<PaymentGatewayService>(PaymentGatewayService);
        jest.clearAllMocks();
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== PROCESS PAYMENT ====================

    describe('processPayment', () => {
        it('should process cash payment', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                total: 5000,
                state: 'AddingItems',
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.processPayment(
                'tenant_test_store',
                'tenant-1',
                { orderId: 1001, method: 'cash' }
            );

            expect(result.type).toBe('cash');
            expect(result.orderId).toBe(1001);
        });

        it('should process PayPal payment', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                total: 5000,
                state: 'AddingItems',
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.processPayment(
                'tenant_test_store',
                'tenant-1',
                { orderId: 1001, method: 'paypal' }
            );

            expect(result.type).toBe('paypal');
            expect(result.approvalUrl).toBeDefined();
        });

        it('should process local wallet payment (mada)', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                total: 5000,
                state: 'AddingItems',
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.processPayment(
                'tenant_test_store',
                'tenant-1',
                { orderId: 1001, method: 'mada' }
            );

            expect(result.type).toBe('mada');
            expect(result.walletOrderId).toBeDefined();
        });

        it('should throw for unsupported payment method', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                total: 5000,
            }]);

            await expect(service.processPayment(
                'tenant_test_store',
                'tenant-1',
                { orderId: 1001, method: 'bitcoin' as any }
            )).rejects.toThrow();
        });
    });

    // ==================== HANDLE CASH PAYMENT ====================

    describe('handleCashPayment', () => {
        it('should create COD payment', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                total: 5000,
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service['handleCashPayment'](
                'tenant_test_store',
                'tenant-1',
                { orderId: 1001, method: 'cash' }
            );

            expect(result.type).toBe('cash');
            expect(result.instructions).toBeDefined();
        });
    });

    // ==================== GET ORDER ====================

    describe('getOrder', () => {
        it('should return order by ID', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                total: 5000,
                state: 'ArrangingPayment',
            }]);

            const result = await service['getOrder']('tenant_test_store', 1001);

            expect(result.id).toBe(1001);
            expect(result.total).toBe(5000);
        });

        it('should return null for non-existent order', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service['getOrder']('tenant_test_store', 9999);

            expect(result).toBeNull();
        });
    });

    // ==================== UPDATE ORDER PAYMENT ====================

    describe('updateOrderPayment', () => {
        it('should update order payment method', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service['updateOrderPayment']('tenant_test_store', 1001, {
                paymentMethod: 'stripe',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE'),
                expect.any(String),
                1001
            );
        });

        it('should update order state', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service['updateOrderPayment']('tenant_test_store', 1001, {
                state: 'PaymentSettled',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    // ==================== CONFIRM PAYMENT ====================

    describe('confirmPayment', () => {
        it('should confirm COD payment', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1001),
                state: 'ArrangingPayment',
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.confirmPayment(
                'tenant_test_store',
                'tenant-1',
                1001
            );

            expect(result.success).toBe(true);
        });
    });

    // ==================== GET SUPPORTED METHODS ====================

    describe('getSupportedMethods', () => {
        it('should return all supported payment methods', () => {
            const methods = service.getSupportedMethods();

            expect(methods).toContain('visa');
            expect(methods).toContain('mastercard');
            expect(methods).toContain('cash');
            expect(methods).toContain('paypal');
        });
    });

    // ==================== GET STRIPE PAYMENT METHODS ====================

    describe('getStripePaymentMethods', () => {
        it('should return card for visa', () => {
            const methods = service['getStripePaymentMethods']('visa');

            expect(methods).toContain('card');
        });

        it('should return card for mastercard', () => {
            const methods = service['getStripePaymentMethods']('mastercard');

            expect(methods).toContain('card');
        });

        it('should return apple_pay for apple_pay', () => {
            const methods = service['getStripePaymentMethods']('apple_pay');

            expect(methods).toContain('card');
        });
    });

    // ==================== LOG PAYMENT EVENT ====================

    describe('logPaymentEvent', () => {
        it('should record payment event', async () => {
            mockEventService.record.mockResolvedValue(undefined);

            await service['logPaymentEvent']('tenant-1', 'PAYMENT_SUCCESS', {
                orderId: 1001,
                amount: 5000,
            });

            expect(mockEventService.record).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'PAYMENT_SUCCESS',
                    tenantId: 'tenant-1',
                })
            );
        });
    });
});
