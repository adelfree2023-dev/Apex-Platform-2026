/**
 * Loyalty Controller Unit Tests
 * Covers: Points, Rewards, Redemptions, Transactions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

describe('LoyaltyController', () => {
    let controller: LoyaltyController;

    const mockLoyaltyService = {
        createLoyaltyTables: jest.fn(),
        getOrCreateAccount: jest.fn(),
        addPoints: jest.fn(),
        getRewards: jest.fn(),
        redeemReward: jest.fn(),
        getTransactions: jest.fn(),
        getRedemptions: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [LoyaltyController],
            providers: [
                { provide: LoyaltyService, useValue: mockLoyaltyService },
            ],
        }).compile();

        controller = module.get<LoyaltyController>(LoyaltyController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('migrateLoyalty', () => {
        it('should create loyalty tables', async () => {
            mockLoyaltyService.createLoyaltyTables.mockResolvedValue(undefined);
            const result = await controller.migrateLoyalty('test-store');
            expect(result.success).toBe(true);
        });
    });

    describe('getAccount', () => {
        it('should return loyalty account', async () => {
            mockLoyaltyService.getOrCreateAccount.mockResolvedValue({
                id: 1,
                points: 500,
                tier: 'silver',
            });
            const result = await controller.getAccount('test-store', '1');
            expect(result.success).toBe(true);
            expect(result.data.points).toBe(500);
        });
    });

    describe('addPoints', () => {
        it('should add points', async () => {
            mockLoyaltyService.addPoints.mockResolvedValue({ points: 600 });
            const result = await controller.addPoints('test-store', '1', {
                points: 100,
                type: 'purchase',
            });
            expect(result.success).toBe(true);
            expect(result.message).toContain('100');
        });

        it('should throw for zero points', async () => {
            await expect(controller.addPoints('test-store', '1', {
                points: 0,
            })).rejects.toThrow(HttpException);
        });

        it('should throw for negative points', async () => {
            await expect(controller.addPoints('test-store', '1', {
                points: -50,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getRewards', () => {
        it('should return available rewards', async () => {
            mockLoyaltyService.getRewards.mockResolvedValue([
                { id: 1, name: '10% Discount', points_required: 100 },
            ]);
            const result = await controller.getRewards('test-store');
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });
    });

    describe('redeemReward', () => {
        it('should redeem reward', async () => {
            mockLoyaltyService.redeemReward.mockResolvedValue({
                code: 'REWARD123',
            });
            const result = await controller.redeemReward('test-store', '1', {
                rewardId: 1,
            });
            expect(result.success).toBe(true);
            expect(result.message).toContain('REWARD123');
        });

        it('should throw without rewardId', async () => {
            await expect(controller.redeemReward('test-store', '1', {
                rewardId: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getTransactions', () => {
        it('should return transactions', async () => {
            mockLoyaltyService.getTransactions.mockResolvedValue([
                { id: 1, points: 50 },
            ]);
            const result = await controller.getTransactions('test-store', '1');
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });
    });

    describe('getRedemptions', () => {
        it('should return redemptions', async () => {
            mockLoyaltyService.getRedemptions.mockResolvedValue([
                { id: 1, reward: '10% Discount' },
            ]);
            const result = await controller.getRedemptions('test-store', '1');
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });
    });
});
