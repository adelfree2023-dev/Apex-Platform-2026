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

    describe('requestPayout', () => {
        it('should request payout', async () => {
            mockAffiliateService.requestPayout.mockResolvedValue({ id: 1, status: 'pending' });
            const result = await controller.requestPayout('test-store', '1', {
                amount: 100,
                method: 'bank_transfer',
            });
            expect(result.success).toBe(true);
        });

        it('should throw without amount', async () => {
            await expect(controller.requestPayout('test-store', '1', {
                amount: undefined as any,
                method: 'bank_transfer',
            })).rejects.toThrow(HttpException);
        });
    });
});
