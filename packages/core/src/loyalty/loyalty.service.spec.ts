/**
 * Loyalty Service Unit Tests
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

            // Should create 4 tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(4);
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
        it('should add points and record transaction', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 100,
                tier: 'Bronze',
                lifetime_points: 100,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAccount);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addPoints('tenant_test', 123, 50, 'Purchase', 'Order #001');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
            expect(result.pointsAdded).toBe(50);
        });

        it('should upgrade tier when points threshold reached', async () => {
            const mockAccount = [{
                id: 1,
                customer_id: 123,
                points: 450, // 450 + 100 = 550, should upgrade to Silver
                tier: 'Bronze',
                lifetime_points: 450,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAccount);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addPoints('tenant_test', 123, 100, 'Purchase');

            expect(result.newTier).toBe('Silver');
            expect(result.tierUpgrade).toBe(true);
        });
    });

    describe('redeemPoints', () => {
        it('should redeem points successfully', async () => {
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
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAccount)
                .mockResolvedValueOnce(mockReward)
                .mockResolvedValueOnce([{ id: 1 }]); // redemption record

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.redeemReward('tenant_test', 123, 1);

            expect(result.success).toBe(true);
            expect(result.pointsDeducted).toBe(200);
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
    });

    describe('getTierInfo', () => {
        it('should return Bronze tier for 0-499 points', () => {
            const tier = service['calculateTier'](250);
            expect(tier).toBe('Bronze');
        });

        it('should return Silver tier for 500-1999 points', () => {
            const tier = service['calculateTier'](1000);
            expect(tier).toBe('Silver');
        });

        it('should return Gold tier for 2000-4999 points', () => {
            const tier = service['calculateTier'](3000);
            expect(tier).toBe('Gold');
        });

        it('should return Platinum tier for 5000+ points', () => {
            const tier = service['calculateTier'](10000);
            expect(tier).toBe('Platinum');
        });
    });
});
