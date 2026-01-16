/**
 * Subscription Service Unit Tests — FIXED v2
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubscriptionService', () => {
    let service: SubscriptionService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<SubscriptionService>(SubscriptionService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSubscriptionTables', () => {
        it('should create all subscription tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createSubscriptionTables('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getPlans', () => {
        it('should return all active plans', async () => {
            const mockPlans = [
                { id: 1, name: 'Basic', description: 'Basic plan', price: 9900, interval: 'monthly', interval_count: 1, is_active: true },
                { id: 2, name: 'Pro', description: 'Pro plan', price: 19900, interval: 'monthly', interval_count: 1, is_active: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPlans);

            const result = await service.getPlans('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Basic');
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.getPlans('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('subscribe', () => {
        it('should create a new subscription', async () => {
            // Mock getPlan response
            const mockPlan = [{ id: 1, name: 'Basic', price: 9900, interval: 'monthly', interval_count: 1, is_active: true }];
            // Mock check existing (empty = no existing subscription)
            const mockExisting: any[] = [];
            // Mock create subscription
            const mockNewSub = [{ id: 1, customer_id: 123, plan_id: 1 }];
            // Mock getSubscription for final return
            const mockFinalSub = [{
                id: 1,
                customer_id: 123,
                plan_id: 1,
                status: 'active',
                plan_name: 'Basic',
                plan_price: 9900,
                plan_interval: 'monthly',
                current_period_start: new Date(),
                current_period_end: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockPlan) // getPlan
                .mockResolvedValueOnce(mockExisting) // check existing
                .mockResolvedValueOnce(mockNewSub) // create subscription
                .mockResolvedValueOnce(mockFinalSub); // getSubscription

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined); // record payment

            const result = await service.subscribe('tenant_test', 123, 1);

            expect(result).not.toBeNull();
            expect(result.customerId).toBe(123);
            expect(result.status).toBe('active');
        });

        it('should fail if plan not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.subscribe('tenant_test', 123, 999))
                .rejects.toThrow('Plan not found');
        });

        it('should fail if already subscribed', async () => {
            const mockPlan = [{ id: 1, price: 9900, interval: 'monthly', interval_count: 1, is_active: true }];
            const mockExisting = [{ id: 99 }]; // Already subscribed

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockPlan)
                .mockResolvedValueOnce(mockExisting);

            await expect(service.subscribe('tenant_test', 123, 1))
                .rejects.toThrow('Already subscribed to this plan');
        });
    });

    describe('cancelSubscription', () => {
        it('should cancel an active subscription', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, customer_id: 123, plan_id: 1, status: 'cancelled',
                plan_name: 'Basic', plan_price: 9900, plan_interval: 'monthly',
                current_period_start: new Date(), current_period_end: new Date(),
            }]);

            const result = await service.cancelSubscription('tenant_test', 1);

            expect(result.status).toBe('cancelled');
        });
    });

    describe('getCustomerSubscriptions', () => {
        it('should return customer subscriptions', async () => {
            const mockSubs = [{
                id: 1, customer_id: 123, plan_id: 1, status: 'active',
                plan_name: 'Basic', plan_price: 9900, plan_interval: 'monthly',
                current_period_start: new Date(), current_period_end: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockSubs);

            const result = await service.getCustomerSubscriptions('tenant_test', 123);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('active');
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.getCustomerSubscriptions('tenant_test', 123);

            expect(result).toEqual([]);
        });
    });

    describe('getSubscription', () => {
        it('should return subscription by ID', async () => {
            const mockSub = [{
                id: 1, customer_id: 123, plan_id: 1, status: 'active',
                plan_name: 'Basic', plan_price: 9900, plan_interval: 'monthly',
                current_period_start: new Date(), current_period_end: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockSub);

            const result = await service.getSubscription('tenant_test', 1);

            expect(result).not.toBeNull();
            expect(result.id).toBe(1);
        });

        it('should return null if not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getSubscription('tenant_test', 999);

            expect(result).toBeNull();
        });
    });
    // ==================== CREATE PLAN ====================

    describe('createPlan', () => {
        it('should create a new plan', async () => {
            const planData = { name: 'New Plan', price: 5000, interval: 'yearly' as const };
            const mockCreatedPlan = [{ ...planData, id: 3, interval_count: 1, is_active: true }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCreatedPlan);

            const result = await service.createPlan('tenant_test', planData);

            expect(result.name).toBe('New Plan');
            expect(result.interval).toBe('yearly');
            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO'),
                planData.name,
                null,
                planData.price,
                planData.interval,
                null,
                null
            );
        });
    });

    // ==================== RENEW SUBSCRIPTION ====================

    describe('renewSubscription', () => {
        it('should renew an active subscription', async () => {
            const mockSub = [{
                id: 1, customer_id: 123, plan_id: 1, status: 'active',
                current_period_end: new Date()
            }];
            const mockPlan = [{
                id: 1, name: 'Basic', price: 9900, interval: 'monthly', interval_count: 1
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockSub) // getSubscription
                .mockResolvedValueOnce(mockPlan) // getPlan
                .mockResolvedValueOnce([{ // getSubscription (final)
                    ...mockSub[0],
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }]);

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.renewSubscription('tenant_test', 1);

            expect(result.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2); // Update sub + Record payment
        });

        it('should fail if subscription not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
            await expect(service.renewSubscription('tenant_test', 999))
                .rejects.toThrow('Subscription not found');
        });
    });

    // ==================== PAYMENT HISTORY ====================

    describe('getPaymentHistory', () => {
        it('should return payment history', async () => {
            const mockPayments = [{
                id: BigInt(1), subscription_id: BigInt(1), amount: 9900,
                status: 'paid', payment_date: new Date()
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPayments);

            const result = await service.getPaymentHistory('tenant_test', 1);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('paid');
        });
    });

});
