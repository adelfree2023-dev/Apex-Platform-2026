/**
 * Subscription Service Unit Tests — FIXED
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
                { id: 1, name: 'Basic', slug: 'basic', price: 9900, interval: 'monthly', features: '["Feature 1"]', is_active: true },
                { id: 2, name: 'Pro', slug: 'pro', price: 19900, interval: 'monthly', features: '["Feature 1","Feature 2"]', is_active: true },
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
            const mockPlan = [{ id: 1, price: 9900, interval: 'monthly' }];
            const mockExisting: any[] = []; // No existing subscription
            const mockSubscription = [{
                id: 1,
                customer_id: 123,
                plan_id: 1,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockPlan) // getPlan
                .mockResolvedValueOnce(mockExisting) // check existing
                .mockResolvedValueOnce(mockSubscription); // create subscription

            const result = await service.subscribe('tenant_test', 123, 1);

            expect(result.customerId).toBe(123);
            expect(result.status).toBe('active');
        });

        it('should fail if plan not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.subscribe('tenant_test', 123, 999))
                .rejects.toThrow('Plan not found');
        });
    });

    describe('cancelSubscription', () => {
        it('should cancel an active subscription', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.cancelSubscription('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getCustomerSubscriptions', () => {
        it('should return customer subscriptions', async () => {
            const mockSubs = [
                {
                    id: 1,
                    customer_id: 123,
                    plan_id: 1,
                    status: 'active',
                    plan_name: 'Basic',
                    plan_price: 9900,
                    current_period_start: new Date(),
                    current_period_end: new Date(),
                },
            ];

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
                id: 1,
                customer_id: 123,
                plan_id: 1,
                status: 'active',
                current_period_start: new Date(),
                current_period_end: new Date(),
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
});
