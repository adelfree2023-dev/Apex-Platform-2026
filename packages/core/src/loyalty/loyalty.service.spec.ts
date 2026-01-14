/**
 * Loyalty Service Unit Tests — FIXED
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LoyaltyService', () => {
    let service: LoyaltyService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoyaltyService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<LoyaltyService>(LoyaltyService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createLoyaltyTables', () => {
        it('should create all loyalty tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createLoyaltyTables('tenant_test');

            // Should create 4 tables + default rewards
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getOrCreateAccount', () => {
        it('should return existing account', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 500,
                tier: 'Silver',
                lifetime_points: 1500,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAccount);

            const result = await service.getOrCreateAccount('tenant_test', 123);

            expect(result.id).toBe(1);
            expect(result.points).toBe(500);
            expect(result.tier).toBe('Silver');
        });

        it('should create new account if not exists', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No existing account
                .mockResolvedValueOnce([{ id: 2, customer_id: 456, points: 0, tier: 'Bronze', lifetime_points: 0 }]);

            const result = await service.getOrCreateAccount('tenant_test', 456);

            expect(result.id).toBe(2);
            expect(result.points).toBe(0);
            expect(result.tier).toBe('Bronze');
        });
    });

    describe('addPoints', () => {
        it('should add points and return updated account', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 100,
                tier: 'Bronze',
                lifetime_points: 100,
            }];

            // getOrCreateAccount call
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAccount);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addPoints('tenant_test', 123, 50, 'Purchase', 'Order #001');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('calculatePointsFromOrder', () => {
        it('should calculate 1 point per 10 EGP', () => {
            // 1000 piastres = 10 EGP = 1 point
            expect(service.calculatePointsFromOrder(1000)).toBe(1);
            expect(service.calculatePointsFromOrder(10000)).toBe(10);
            expect(service.calculatePointsFromOrder(500)).toBe(0);
        });
    });

    describe('redeemReward', () => {
        it('should redeem reward successfully', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 500,
                tier: 'Silver',
                lifetime_points: 1000,
            }];

            const mockReward = [{
                id: 1,
                name: 'Free Shipping',
                points_cost: 200,
                is_active: true,
                type: 'shipping',
                value: 0,
            }];

            const mockRedemption = [{
                id: 1,
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAccount) // getOrCreateAccount
                .mockResolvedValueOnce(mockReward) // get reward
                .mockResolvedValueOnce(mockRedemption); // create redemption

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.redeemReward('tenant_test', 123, 1);

            expect(result.redemptionId).toBe(1);
            expect(result.pointsSpent).toBe(200);
            expect(result.rewardName).toBe('Free Shipping');
        });

        it('should fail if insufficient points', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 50,
                tier: 'Bronze',
                lifetime_points: 50,
            }];

            const mockReward = [{
                id: 1,
                name: 'Discount',
                points_cost: 200,
                is_active: true,
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAccount)
                .mockResolvedValueOnce(mockReward);

            await expect(service.redeemReward('tenant_test', 123, 1))
                .rejects.toThrow('Insufficient points');
        });

        it('should fail if reward not found', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 500,
                tier: 'Silver',
                lifetime_points: 500,
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAccount)
                .mockResolvedValueOnce([]); // No reward

            await expect(service.redeemReward('tenant_test', 123, 999))
                .rejects.toThrow('Reward not found');
        });
    });

    describe('getRewards', () => {
        it('should return all active rewards', async () => {
            const mockRewards = [
                { id: 1, name: '5% Off', points_cost: 100, type: 'discount', value: 5, is_active: true },
                { id: 2, name: '10% Off', points_cost: 200, type: 'discount', value: 10, is_active: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockRewards);

            const result = await service.getRewards('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('5% Off');
            expect(result[0].pointsCost).toBe(100);
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.getRewards('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('getTransactions', () => {
        it('should return transaction history', async () => {
            const mockAccount = [{ id: 1, customer_id: 123, points: 100, tier: 'Bronze', lifetime_points: 100 }];
            const mockTransactions = [
                { id: 1, type: 'Purchase', points: 50, description: 'Order #001', order_id: 100, created_at: new Date() },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAccount)
                .mockResolvedValueOnce(mockTransactions);

            const result = await service.getTransactions('tenant_test', 123);

            expect(result).toHaveLength(1);
            expect(result[0].points).toBe(50);
        });
    });
});
