/**
 * Payment Gateway Service Unit Tests
 * Root-analyzed: Multi-provider payment processing with Arabic payment methods support
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger, HttpException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentGatewayService', () => {
    let service: PaymentGatewayService;

    const mockPrismaService = {
        $queryRawUnsafe: jest.fn(),
        $executeRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentGatewayService,
                { provide: PrismaService, useValue: mockPrismaService },
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
        const validRequest = {
            amount: 1000,
            currency: 'EGP',
            provider: 'fawry',
            orderId: 'order-123',
            customer: {
                email: 'test@example.com',
                phone: '+201234567890',
                name: 'Ahmed Mohamed',
            },
            items: [
                { id: 1, name: 'iPhone 15', quantity: 1, price: 1000 }
            ]
        };

        it('should process fawry payment successfully', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ provider: 'fawry', is_active: true, min_amount: 5, max_amount: 50000 }]) // validatePaymentMethod
                .mockResolvedValueOnce([{ id: BigInt(1), order_id: 'order-123', amount: 1000, currency: 'EGP' }]); // transaction
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.processPayment('tenant_test_store', validRequest);

            expect(result.status).toBeDefined();
            expect(result.orderId).toBe('order-123');
        });

        it('should throw error for zero amount', async () => {
            const invalidRequest = { ...validRequest, amount: 0 };

            await expect(
                service.processPayment('tenant_test_store', invalidRequest)
            ).rejects.toThrow('Amount must be greater than zero');
        });

        it('should throw error for missing provider', async () => {
            const invalidRequest = { ...validRequest, provider: '' };

            await expect(
                service.processPayment('tenant_test_store', invalidRequest)
            ).rejects.toThrow('Provider is required');
        });

        it('should throw error for missing order ID', async () => {
            const invalidRequest = { ...validRequest, orderId: '' };

            await expect(
                service.processPayment('tenant_test_store', invalidRequest)
            ).rejects.toThrow('Order ID is required');
        });

        it('should throw error for missing customer email', async () => {
            const invalidRequest = { ...validRequest, customer: { ...validRequest.customer, email: '' } };

            await expect(
                service.processPayment('tenant_test_store', invalidRequest)
            ).rejects.toThrow('Customer email is required');
        });

        it('should throw error for empty items', async () => {
            const invalidRequest = { ...validRequest, items: [] };

            await expect(
                service.processPayment('tenant_test_store', invalidRequest)
            ).rejects.toThrow('At least one item is required');
        });
    });

    // ==================== VALIDATE PAYMENT METHOD ====================

    describe('validatePaymentMethod', () => {
        it('should return available for valid method', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                provider: 'fawry',
                is_active: true,
                min_amount: 5,
                max_amount: 50000,
            }]);

            const result = await service.validatePaymentMethod('tenant_test', 'fawry', 100, 'EGP');

            expect(result.available).toBe(true);
        });

        it('should return not available for unsupported method', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.validatePaymentMethod('tenant_test', 'unknown', 100, 'EGP');

            expect(result.available).toBe(false);
            expect(result.reason).toBe('Payment method not supported');
        });

        it('should return not available when amount below minimum', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                provider: 'fawry',
                is_active: true,
                min_amount: 100,
                max_amount: 50000,
            }]);

            const result = await service.validatePaymentMethod('tenant_test', 'fawry', 50, 'EGP');

            expect(result.available).toBe(false);
            expect(result.reason).toBe('Amount below minimum');
        });

        it('should return not available when amount exceeds maximum', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                provider: 'fawry',
                is_active: true,
                min_amount: 5,
                max_amount: 1000,
            }]);

            const result = await service.validatePaymentMethod('tenant_test', 'fawry', 5000, 'EGP');

            expect(result.available).toBe(false);
            expect(result.reason).toBe('Amount exceeds maximum');
        });
    });

    // ==================== GET PAYMENT METHODS ====================

    describe('getPaymentMethods', () => {
        it('should return available methods for territory', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { provider: 'fawry' },
                { provider: 'valu' },
            ]);

            const result = await service.getPaymentMethods('tenant_test', 'EGYPT');

            expect(result).toContain('fawry');
            expect(result).toContain('valu');
        });

        it('should return empty array when no methods available', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getPaymentMethods('tenant_test', 'UNKNOWN');

            expect(result).toEqual([]);
        });
    });

    // ==================== CALCULATE SETTLEMENT ====================

    describe('calculateSettlement', () => {
        it('should calculate basic settlement', async () => {
            const orderDetails = {
                totalAmount: 1000,
                items: [
                    { price: 1000, commissionRate: 0.1 }
                ],
                cooperativeDeal: { enabled: false }
            };

            const result = await service.calculateSettlement(orderDetails);

            expect(result.platformFee).toBe(100); // 10% of 1000
            expect(result.vendorAmount).toBe(900); // 1000 - 100
            expect(result.totalSettlement).toBe(1000);
        });

        it('should apply cooperative marketing fee', async () => {
            const orderDetails = {
                totalAmount: 1000,
                items: [
                    { price: 1000, commissionRate: 0.1 }
                ],
                cooperativeDeal: { enabled: true, sharedMarketingFee: 0.05 }
            };

            const result = await service.calculateSettlement(orderDetails);

            expect(result.sharedMarketingFee).toBe(50); // 5% of 1000
            expect(result.vendorAmount).toBe(850); // 1000 - 100 - 50
        });
    });

    // ==================== GET SUPPORTED PROVIDERS ====================

    describe('getSupportedProviders', () => {
        it('should return all supported payment providers', () => {
            const providers = service.getSupportedProviders();

            expect(providers).toContain('fawry');
            expect(providers).toContain('paypal');
            expect(providers).toContain('stripe');
            expect(providers).toContain('mada');
            expect(providers).toContain('valu');
        });
    });

    // ==================== REFUND PAYMENT ====================

    describe('refundPayment', () => {
        it('should refund paid payment', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1),
                order_id: 'order-123',
                amount: 1000,
                status: 'paid',
                provider: 'fawry',
                provider_transaction_id: 'tx-123',
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.refundPayment('tenant_test', 'order-123', 500);

            expect(result.success).toBe(true);
            expect(result.refundedAmount).toBe(500);
        });

        it('should throw error when original payment not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(
                service.refundPayment('tenant_test', 'order-999', 100)
            ).rejects.toThrow('Original payment not found');
        });

        it('should throw error when refund amount exceeds original', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1),
                amount: 100,
                status: 'paid',
                provider: 'stripe',
                provider_transaction_id: 'tx-123',
            }]);

            await expect(
                service.refundPayment('tenant_test', 'order-123', 500)
            ).rejects.toThrow('Refund amount exceeds original');
        });
    });

    // ==================== PCI COMPLIANCE ====================

    describe('isPCICompliant', () => {
        it('should return true for PCI compliance', () => {
            expect(service.isPCICompliant()).toBe(true);
        });
    });

    // ==================== TOKENIZE PAYMENT DATA ====================

    describe('tokenizePaymentData', () => {
        it('should mask card number and return token', () => {
            const result = service.tokenizePaymentData({
                cardNumber: '4111111111111234',
                cvv: '123',
            });

            expect(result.cardNumber).toBe('****-****-****-1234');
            expect(result.token).toBeDefined();
            expect(result.token).toMatch(/^tok_/);
        });
    });

    // ==================== INITIALIZE PAYMENT PROVIDERS ====================

    describe('initializePaymentProviders', () => {
        it('should create all necessary tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.initializePaymentProviders('tenant_test');

            // Should verify calls for transaction table, method table, settlement table, and default methods
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(3 + 8); // 3 tables + 8 default methods
        });
    });

    // ==================== HANDLE WEBBOOK ====================

    describe('handleWebhook', () => {
        const webhookPayload = {
            provider: 'stripe',
            referenceNumber: 'ref-123',
            status: 'paid',
            amount: 1000,
            orderId: 'order-123'
        };

        it('should process valid webhook', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined); // Update status

            await service.handleWebhook('tenant_test', webhookPayload);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE'),
                'paid',
                expect.any(String),
                'order-123',
                'stripe'
            );
        });

        it('should validate signature (future implementation)', async () => {
            const result = service.validateWebhookSignature(webhookPayload, 'stripe');
            expect(result).toBe(true);
        });
    });

    // ==================== TRANSACTION HISTORY ====================

    describe('getTransactionHistory', () => {
        it('should return mapped transaction history', async () => {
            const mockTxData = [{
                id: BigInt(1),
                order_id: 'order-123',
                amount: 100,
                currency: 'EGP',
                status: 'paid',
                provider: 'fawry',
                created_at: new Date(),
                reference_number: 'ref-123'
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockTxData);

            const result = await service.getTransactionHistory('tenant_test', 1);

            expect(result).toHaveLength(1);
            expect(result[0].orderId).toBe('order-123');
            expect(result[0].amount).toBe(100);
        });

        it('should apply date filters', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const startDate = new Date();
            const endDate = new Date();

            await service.getTransactionHistory('tenant_test', 1, startDate, endDate);

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('AND created_at >='),
                1,
                startDate,
                endDate
            );
        });
    });

});