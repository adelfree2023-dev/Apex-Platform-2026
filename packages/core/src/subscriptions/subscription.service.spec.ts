/**
 * Subscription Service Unit Tests
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

            // Should create 3 tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(3);
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
    });

    describe('subscribe', () => {
        it('should create a new subscription', async () => {
            const mockPlan = [{ id: 1, price: 9900, interval: 'monthly' }];
            const mockSubscription = [{ id: 1, customer_id: 123, plan_id: 1, status: 'active' }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockPlan)
                .mockResolvedValueOnce(mockSubscription);

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

    describe('renewSubscription', () => {
        it('should renew an existing subscription', async () => {
            const mockSub = [{ id: 1, plan_id: 1, status: 'active' }];
            const mockPlan = [{ id: 1, price: 9900, interval: 'monthly' }];
            const mockPayment = [{ id: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockSub)
                .mockResolvedValueOnce(mockPlan)
                .mockResolvedValueOnce(mockPayment);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.renewSubscription('tenant_test', 1);

            expect(result.renewed).toBe(true);
        });
    });

    describe('getCustomerSubscriptions', () => {
        it('should return customer subscriptions', async () => {
            const mockSubs = [
                { id: 1, customer_id: 123, plan_id: 1, status: 'active', plan_name: 'Basic', plan_price: 9900 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockSubs);

            const result = await service.getCustomerSubscriptions('tenant_test', 123);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('active');
        });
    });
});
