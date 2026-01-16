/**
 * Subscription Controller Unit Tests
 * Covers: Plans, Subscriptions, Renewals, Cancellations, Payments
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionController', () => {
    let controller: SubscriptionController;

    const mockSubscriptionService = {
        createSubscriptionTables: jest.fn(),
        getPlans: jest.fn(),
        createPlan: jest.fn(),
        subscribe: jest.fn(),
        getCustomerSubscriptions: jest.fn(),
        getSubscription: jest.fn(),
        cancelSubscription: jest.fn(),
        renewSubscription: jest.fn(),
        getPaymentHistory: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriptionController],
            providers: [
                { provide: SubscriptionService, useValue: mockSubscriptionService },
            ],
        }).compile();

        controller = module.get<SubscriptionController>(SubscriptionController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateSubscriptions', () => {
        it('should create subscription tables', async () => {
            mockSubscriptionService.createSubscriptionTables.mockResolvedValue(undefined);

            const result = await controller.migrateSubscriptions('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Subscription tables created');
        });

        it('should handle migration errors', async () => {
            mockSubscriptionService.createSubscriptionTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateSubscriptions('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== PLANS ====================

    describe('getPlans', () => {
        it('should return all subscription plans', async () => {
            const plans = [
                { id: 1, name: 'Basic', price: 99, interval: 'month' },
                { id: 2, name: 'Premium', price: 199, interval: 'month' },
                { id: 3, name: 'Enterprise', price: 499, interval: 'month' },
            ];
            mockSubscriptionService.getPlans.mockResolvedValue(plans);

            const result = await controller.getPlans('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.count).toBe(3);
        });

        it('should return empty on error', async () => {
            mockSubscriptionService.getPlans.mockRejectedValue(new Error());

            const result = await controller.getPlans('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('createPlan', () => {
        it('should create subscription plan', async () => {
            mockSubscriptionService.createPlan.mockResolvedValue({
                id: 4,
                name: 'VIP',
                price: 999,
                interval: 'year',
            });

            const result = await controller.createPlan('test-store', {
                name: 'VIP',
                price: 999,
                interval: 'year',
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('VIP');
            expect(result.message).toContain('Plan created');
        });

        it('should throw without name', async () => {
            await expect(controller.createPlan('test-store', {
                name: '',
                price: 100,
                interval: 'month',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without price', async () => {
            await expect(controller.createPlan('test-store', {
                name: 'Test',
                price: undefined as any,
                interval: 'month',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without interval', async () => {
            await expect(controller.createPlan('test-store', {
                name: 'Test',
                price: 100,
                interval: '',
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== SUBSCRIPTIONS ====================

    describe('subscribe', () => {
        it('should subscribe customer to plan', async () => {
            mockSubscriptionService.subscribe.mockResolvedValue({
                id: 1,
                customerId: 100,
                planId: 2,
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });

            const result = await controller.subscribe('test-store', {
                customerId: 100,
                planId: 2,
                paymentMethod: 'card',
            });

            expect(result.success).toBe(true);
            expect(result.data.status).toBe('active');
            expect(result.message).toContain('Subscribed');
        });

        it('should throw without customerId', async () => {
            await expect(controller.subscribe('test-store', {
                customerId: undefined as any,
                planId: 1,
            })).rejects.toThrow(HttpException);
        });

        it('should throw without planId', async () => {
            await expect(controller.subscribe('test-store', {
                customerId: 1,
                planId: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getCustomerSubscriptions', () => {
        it('should return customer subscriptions', async () => {
            mockSubscriptionService.getCustomerSubscriptions.mockResolvedValue([
                { id: 1, planName: 'Basic', status: 'active' },
                { id: 2, planName: 'Premium', status: 'cancelled' },
            ]);

            const result = await controller.getCustomerSubscriptions('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockSubscriptionService.getCustomerSubscriptions.mockRejectedValue(new Error());

            const result = await controller.getCustomerSubscriptions('test-store', '100');

            expect(result.data).toEqual([]);
        });
    });

    describe('getSubscription', () => {
        it('should return subscription details', async () => {
            mockSubscriptionService.getSubscription.mockResolvedValue({
                id: 1,
                status: 'active',
                plan: { name: 'Premium' },
            });

            const result = await controller.getSubscription('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
            expect(result.data.status).toBe('active');
        });

        it('should return found: false for non-existent', async () => {
            mockSubscriptionService.getSubscription.mockResolvedValue(null);

            const result = await controller.getSubscription('test-store', '999');

            expect(result.found).toBe(false);
        });
    });

    // ==================== CANCEL/RENEW ====================

    describe('cancelSubscription', () => {
        it('should cancel subscription immediately', async () => {
            mockSubscriptionService.cancelSubscription.mockResolvedValue({
                id: 1,
                status: 'cancelled',
            });

            const result = await controller.cancelSubscription('test-store', '1', 'true');

            expect(result.success).toBe(true);
            expect(result.message).toContain('cancelled');
        });

        it('should schedule cancellation at period end', async () => {
            mockSubscriptionService.cancelSubscription.mockResolvedValue({
                id: 1,
                status: 'active',
                cancelAtPeriodEnd: true,
            });

            const result = await controller.cancelSubscription('test-store', '1', 'false');

            expect(result.message).toContain('period end');
        });

        it('should handle cancellation errors', async () => {
            mockSubscriptionService.cancelSubscription.mockRejectedValue(new Error('Error'));

            await expect(controller.cancelSubscription('test-store', '1'))
                .rejects.toThrow(HttpException);
        });
    });

    describe('renewSubscription', () => {
        it('should renew subscription', async () => {
            mockSubscriptionService.renewSubscription.mockResolvedValue({
                id: 1,
                status: 'active',
                renewedAt: new Date(),
            });

            const result = await controller.renewSubscription('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.message).toContain('renewed');
        });

        it('should handle renewal errors', async () => {
            mockSubscriptionService.renewSubscription.mockRejectedValue(new Error('Payment failed'));

            await expect(controller.renewSubscription('test-store', '1'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== PAYMENT HISTORY ====================

    describe('getPaymentHistory', () => {
        it('should return payment history', async () => {
            mockSubscriptionService.getPaymentHistory.mockResolvedValue([
                { id: 1, amount: 199, status: 'paid', date: new Date() },
                { id: 2, amount: 199, status: 'paid', date: new Date() },
            ]);

            const result = await controller.getPaymentHistory('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockSubscriptionService.getPaymentHistory.mockRejectedValue(new Error());

            const result = await controller.getPaymentHistory('test-store', '1');

            expect(result.data).toEqual([]);
        });
    });
});
