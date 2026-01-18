/**
 * Affiliate Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateService } from './affiliate.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AffiliateService', () => {
    let service: AffiliateService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AffiliateService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<AffiliateService>(AffiliateService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAffiliateTables', () => {
        it('should create all affiliate tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createAffiliateTables('tenant_test');

            // Should create 3 tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(3);
        });
    });

    describe('applyAffiliate', () => {
        it('should create affiliate application', async () => {
            const mockAffiliate = [{
                id: 1,
                name: 'John Affiliate',
                email: 'john@affiliate.com',
                referral_code: 'REF-ABC123',
                commission_rate: 10,
                status: 'pending',
                total_earnings: 0,
                total_referrals: 0,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAffiliate);

            const result = await service.applyAffiliate('tenant_test', {
                name: 'John Affiliate',
                email: 'john@affiliate.com',
                commissionRate: 10,
            });

            expect(result.name).toBe('John Affiliate');
            expect(result.status).toBe('pending');
            expect(result.referralCode).toContain('REF-');
        });
    });

    describe('getAffiliate', () => {
        it('should return affiliate by ID', async () => {
            const mockAffiliate = [{
                id: 1,
                name: 'Top Affiliate',
                email: 'top@affiliate.com',
                referral_code: 'REF-TOP123',
                commission_rate: 15,
                status: 'approved',
                total_earnings: 50000,
                total_referrals: 25,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAffiliate);

            const result = await service.getAffiliate('tenant_test', 1);

            expect(result).not.toBeNull();
            expect(result.totalEarnings).toBe(50000);
            expect(result.totalReferrals).toBe(25);
        });

        it('should return null if affiliate not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getAffiliate('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    describe('getAffiliateByCode', () => {
        it('should return affiliate by referral code', async () => {
            const mockAffiliate = [{
                id: 1,
                name: 'Code Affiliate',
                referral_code: 'REF-XYZ789',
                commission_rate: 12,
                status: 'approved',
                total_earnings: 10000,
                total_referrals: 10,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAffiliate);

            const result = await service.getAffiliateByCode('tenant_test', 'REF-XYZ789');

            expect(result).not.toBeNull();
            expect(result.referralCode).toBe('REF-XYZ789');
        });
    });

    describe('approveAffiliate', () => {
        it('should approve pending affiliate', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1,
                name: 'New Affiliate',
                status: 'approved',
                commission_rate: 10,
                total_earnings: 0,
                total_referrals: 0,
            }]);

            const result = await service.approveAffiliate('tenant_test', 1);

            expect(result.status).toBe('approved');
        });
    });

    describe('trackReferral', () => {
        it('should track referral and calculate commission', async () => {
            const mockAffiliate = [{
                id: 1,
                commission_rate: 10,
                status: 'approved',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockAffiliate);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.trackReferral('tenant_test', 'REF-ABC', 'ORD-100', 50000);

            expect(result.affiliateId).toBe(1);
            expect(result.commission).toBe(5000); // 10% of 50000
        });

        it('should fail with invalid referral code', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.trackReferral('tenant_test', 'INVALID', 'ORD-100', 50000))
                .rejects.toThrow('Invalid referral code');
        });
    });

    describe('getReferrals', () => {
        it('should return affiliate referrals', async () => {
            const mockReferrals = [
                { id: 1, order_id: 100, order_total: 50000, commission: 5000, status: 'pending' },
                { id: 2, order_id: 101, order_total: 30000, commission: 3000, status: 'paid' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockReferrals);

            const result = await service.getReferrals('tenant_test', 1);

            expect(result).toHaveLength(2);
            expect(result[0].commission).toBe(5000);
        });
    });

    describe('getAffiliateStats', () => {
        it('should return affiliate dashboard stats', async () => {
            const mockAffiliate = [{
                id: 1, name: 'Test Affiliate', status: 'approved',
                referral_code: 'REF-TEST', commission_rate: 10,
                total_earnings: 100000, total_referrals: 50,
            }];
            const mockPending = [{ total: 5000 }];
            const mockPaid = [{ total: 95000 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAffiliate)
                .mockResolvedValueOnce(mockPending)
                .mockResolvedValueOnce(mockPaid);

            const result = await service.getAffiliateStats('tenant_test', 1);

            expect(result.affiliate.name).toBe('Test Affiliate');
            expect(result.pendingCommission).toBe(5000);
            expect(result.paidCommission).toBe(95000);
        });
    });

    describe('requestPayout', () => {
        it('should create payout request', async () => {
            const mockAffiliate = [{ id: 1, name: 'Test', status: 'approved' }];
            const mockPending = [{ total: 10000 }];
            const mockPayout = [{ id: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAffiliate)
                .mockResolvedValueOnce(mockPending)
                .mockResolvedValueOnce(mockPayout);

            const result = await service.requestPayout('tenant_test', 1, 5000, 'paypal');

            expect(result.amount).toBe(5000);
            expect(result.method).toBe('paypal');
        });

        it('should fail if insufficient balance', async () => {
            const mockAffiliate = [{ id: 1, name: 'Test', status: 'approved' }];
            const mockPending = [{ total: 1000 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockAffiliate)
                .mockResolvedValueOnce(mockPending);

            await expect(service.requestPayout('tenant_test', 1, 5000, 'paypal'))
                .rejects.toThrow('Insufficient balance');
        });
    });
});
