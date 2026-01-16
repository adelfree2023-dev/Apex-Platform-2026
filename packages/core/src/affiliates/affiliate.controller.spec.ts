/**
 * Affiliate Controller Unit Tests
 * Covers: Application, Approval, Tracking, Payouts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AffiliateController } from './affiliate.controller';
import { AffiliateService } from './affiliate.service';

describe('AffiliateController', () => {
    let controller: AffiliateController;

    const mockAffiliateService = {
        createAffiliateTables: jest.fn(),
        applyAffiliate: jest.fn(),
        getAffiliates: jest.fn(),
        getAffiliate: jest.fn(),
        approveAffiliate: jest.fn(),
        trackReferral: jest.fn(),
        getReferrals: jest.fn(),
        getAffiliateStats: jest.fn(),
        requestPayout: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AffiliateController],
            providers: [
                { provide: AffiliateService, useValue: mockAffiliateService },
            ],
        }).compile();

        controller = module.get<AffiliateController>(AffiliateController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('migrateAffiliates', () => {
        it('should create affiliate tables', async () => {
            mockAffiliateService.createAffiliateTables.mockResolvedValue(undefined);
            const result = await controller.migrateAffiliates('test-store');
            expect(result.success).toBe(true);
        });
    });

    describe('applyAffiliate', () => {
        it('should submit application', async () => {
            mockAffiliateService.applyAffiliate.mockResolvedValue({ id: 1, status: 'pending' });
            const result = await controller.applyAffiliate('test-store', {
                name: 'John',
                email: 'john@test.com',
                commissionRate: 10,
            });
            expect(result.success).toBe(true);
        });

        it('should throw without name', async () => {
            await expect(controller.applyAffiliate('test-store', {
                name: '',
                email: 'john@test.com',
                commissionRate: 10,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getAffiliates', () => {
        it('should return affiliates', async () => {
            mockAffiliateService.getAffiliates.mockResolvedValue([{ id: 1 }]);
            const result = await controller.getAffiliates('test-store');
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });
    });

    describe('approveAffiliate', () => {
        it('should approve affiliate', async () => {
            mockAffiliateService.approveAffiliate.mockResolvedValue({ id: 1, status: 'active' });
            const result = await controller.approveAffiliate('test-store', '1');
            expect(result.success).toBe(true);
        });
    });

    describe('trackReferral', () => {
        it('should track referral', async () => {
            mockAffiliateService.trackReferral.mockResolvedValue({ commission: 50 });
            const result = await controller.trackReferral('test-store', {
                affiliateCode: 'ABC123',
                orderId: 1,
                orderTotal: 500,
            });
            expect(result.success).toBe(true);
        });
    });

    describe('getAffiliate', () => {
        it('should return affiliate by ID', async () => {
            mockAffiliateService.getAffiliate.mockResolvedValue({ id: 1, name: 'John' });
            const result = await controller.getAffiliate('test-store', '1');
            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
        });

        it('should return found=false on error', async () => {
            mockAffiliateService.getAffiliate.mockRejectedValue(new Error('DB error'));
            const result = await controller.getAffiliate('test-store', '999');
            expect(result.found).toBe(false);
        });
    });

    describe('getReferrals', () => {
        it('should return referrals', async () => {
            mockAffiliateService.getReferrals.mockResolvedValue([{ id: 1, orderId: 100 }]);
            const result = await controller.getReferrals('test-store', '1');
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });

        it('should return empty on error', async () => {
            mockAffiliateService.getReferrals.mockRejectedValue(new Error('fail'));
            const result = await controller.getReferrals('test-store', '1');
            expect(result.data).toEqual([]);
        });
    });

    describe('getAffiliateDashboard', () => {
        it('should return stats', async () => {
            mockAffiliateService.getAffiliateStats.mockResolvedValue({ totalEarnings: 500 });
            const result = await controller.getAffiliateDashboard('test-store', '1');
            expect(result.success).toBe(true);
            expect(result.data.totalEarnings).toBe(500);
        });

        it('should return null data on error', async () => {
            mockAffiliateService.getAffiliateStats.mockRejectedValue(new Error('fail'));
            const result = await controller.getAffiliateDashboard('test-store', '1');
            expect(result.data).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('migrateAffiliates should throw on error', async () => {
            mockAffiliateService.createAffiliateTables.mockRejectedValue(new Error('Migration failed'));
            await expect(controller.migrateAffiliates('test-store'))
                .rejects.toThrow(HttpException);
        });

        it('applyAffiliate should throw on service error', async () => {
            mockAffiliateService.applyAffiliate.mockRejectedValue(new Error('DB fail'));
            await expect(controller.applyAffiliate('test-store', {
                name: 'John',
                email: 'john@test.com',
                commissionRate: 10,
            })).rejects.toThrow(HttpException);
        });

        it('approveAffiliate should throw on error', async () => {
            mockAffiliateService.approveAffiliate.mockRejectedValue(new Error('fail'));
            await expect(controller.approveAffiliate('test-store', '1'))
                .rejects.toThrow(HttpException);
        });

        it('trackReferral should return success=false on error', async () => {
            mockAffiliateService.trackReferral.mockRejectedValue(new Error('fail'));
            const result = await controller.trackReferral('test-store', {
                affiliateCode: 'ABC',
                orderId: 1,
                orderTotal: 100,
            });
            expect(result.success).toBe(false);
        });

        it('requestPayout should throw on service error', async () => {
            mockAffiliateService.requestPayout.mockRejectedValue(new Error('fail'));
            await expect(controller.requestPayout('test-store', '1', {
                amount: 100,
                method: 'bank_transfer',
            })).rejects.toThrow(HttpException);
        });
    });
});
