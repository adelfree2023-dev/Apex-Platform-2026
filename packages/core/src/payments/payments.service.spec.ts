/**
 * Payments Service Unit Tests — CRITICAL P0
 * Tests Stripe payment processing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';

// Mock Stripe
jest.mock('./stripe.config', () => ({
    stripe: {
        paymentIntents: {
            create: jest.fn(),
            retrieve: jest.fn(),
        },
        webhooks: {
            constructEvent: jest.fn(),
        },
    },
    STRIPE_CONFIG: {
        currency: 'egp',
        webhookSecret: 'test_secret',
    },
}));

import { stripe, STRIPE_CONFIG } from './stripe.config';

describe('PaymentsService', () => {
    let service: PaymentsService;

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
                PaymentsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EventService, useValue: mockEventService },
            ],
        }).compile();

        service = module.get<PaymentsService>(PaymentsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createPaymentIntent', () => {
        it('should create a Stripe payment intent for order', async () => {
            const mockOrder = [{
                id: 1,
                code: 'ORD-001',
                total: 50000,
                state: 'Active',
                customer_email: 'customer@test.com',
            }];

            const mockPaymentIntent = {
                id: 'pi_test123',
                amount: 50000,
                currency: 'egp',
                client_secret: 'secret_test',
            };

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrder);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            (stripe.paymentIntents.create as jest.Mock).mockResolvedValue(mockPaymentIntent);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.createPaymentIntent('tenant_test', 'tenant-id', {
                orderId: 1,
            });

            expect(result.id).toBe('pi_test123');
            expect(result.amount).toBe(50000);
            expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 50000,
                    currency: 'egp',
                })
            );
        });

        it('should fail if order not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.createPaymentIntent('tenant_test', 'tenant-id', {
                orderId: 999,
            })).rejects.toThrow('Order not found');
        });

        it('should fail if order already paid', async () => {
            const mockOrder = [{
                id: 1,
                state: 'Paid',
                total: 50000,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrder);

            await expect(service.createPaymentIntent('tenant_test', 'tenant-id', {
                orderId: 1,
            })).rejects.toThrow('Order already paid');
        });
    });

    describe('handleWebhook', () => {
        it('should handle payment_intent.succeeded event', async () => {
            const mockEvent = {
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test123',
                        amount: 50000,
                        metadata: {
                            orderId: '1',
                            tenantId: 'tenant-id',
                            tenantSchema: 'tenant_test',
                        },
                    },
                },
            };

            (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.handleWebhook(
                Buffer.from('payload'),
                'signature'
            );

            expect(result.received).toBe(true);
            expect(result.event).toBe('payment_intent.succeeded');
        });

        it('should handle payment_intent.payment_failed event', async () => {
            const mockEvent = {
                type: 'payment_intent.payment_failed',
                data: {
                    object: {
                        id: 'pi_test123',
                        amount: 50000,
                        last_payment_error: { message: 'Card declined' },
                        metadata: {
                            orderId: '1',
                            tenantId: 'tenant-id',
                            tenantSchema: 'tenant_test',
                        },
                    },
                },
            };

            (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.handleWebhook(
                Buffer.from('payload'),
                'signature'
            );

            expect(result.received).toBe(true);
            expect(result.event).toBe('payment_intent.payment_failed');
        });

        it('should reject invalid webhook signature', async () => {
            (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid signature');
            });

            await expect(service.handleWebhook(
                Buffer.from('payload'),
                'invalid_signature'
            )).rejects.toThrow('Webhook signature verification failed');
        });
    });

    describe('getPaymentStatus', () => {
        it('should retrieve payment intent status', async () => {
            const mockPaymentIntent = {
                id: 'pi_test123',
                status: 'succeeded',
                amount: 50000,
            };

            (stripe.paymentIntents.retrieve as jest.Mock).mockResolvedValue(mockPaymentIntent);

            const result = await service.getPaymentStatus('pi_test123');

            expect(result.status).toBe('succeeded');
        });
    });

    describe('Payment Security Tests', () => {
        it('should include tenant metadata in payment intent', async () => {
            const mockOrder = [{
                id: 1,
                code: 'ORD-001',
                total: 50000,
                state: 'Active',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrder);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: 'pi_test',
            });
            mockEventService.record.mockResolvedValue(undefined);

            await service.createPaymentIntent('tenant_test', 'tenant-id', {
                orderId: 1,
            });

            expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        tenantId: 'tenant-id',
                        tenantSchema: 'tenant_test',
                    }),
                })
            );
        });
    });
});
