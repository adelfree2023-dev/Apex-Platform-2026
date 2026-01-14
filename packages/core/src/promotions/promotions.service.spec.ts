/**
 * Promotions Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PromotionsService', () => {
    let service: PromotionsService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PromotionsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<PromotionsService>(PromotionsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createPromotionsTables', () => {
        it('should create promotions tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createPromotionsTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('createCoupon', () => {
        it('should create a coupon', async () => {
            const mockCoupon = [{
                id: 1, code: 'SUMMER20', type: 'percentage',
                discount: 20, is_active: true,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCoupon);

            const result = await service.createCoupon('tenant_test', {
                code: 'SUMMER20',
                type: 'percentage',
                discount: 20,
            });

            expect(result.code).toBe('SUMMER20');
        });
    });

    describe('validateCoupon', () => {
        it('should validate a valid coupon', async () => {
            const mockCoupon = [{
                id: 1, code: 'TEST10', type: 'percentage',
                discount: 10, min_order_amount: 5000,
                is_active: true, expiry_date: new Date('2026-12-31'),
                usage_limit: 100, usage_count: 5,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCoupon);

            const result = await service.validateCoupon('tenant_test', 'TEST10', 10000);

            expect(result.valid).toBe(true);
        });

        it('should reject invalid coupon', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.validateCoupon('tenant_test', 'INVALID', 10000);

            expect(result.valid).toBe(false);
        });
    });

    describe('getCoupons', () => {
        it('should return all coupons', async () => {
            const mockCoupons = [
                { id: 1, code: 'COUPON1', type: 'percentage', discount: 10 },
                { id: 2, code: 'COUPON2', type: 'fixed', discount: 500 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCoupons);

            const result = await service.getCoupons('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('applyCoupon', () => {
        it('should apply coupon (increment usage)', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.applyCoupon('tenant_test', 'TEST10');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('deleteCoupon', () => {
        it('should delete a coupon', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.deleteCoupon('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('createReview', () => {
        it('should create a product review', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const mockReview = [{
                id: 1, product_id: 1, rating: 5, title: 'Great!',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockReview);

            const result = await service.createReview('tenant_test', 1, 123, 5, 'Great!', 'Amazing product');

            expect(result).toBeDefined();
        });
    });

    describe('getProductReviews', () => {
        it('should return product reviews', async () => {
            const mockReviews = [
                { id: 1, rating: 5, title: 'Great' },
                { id: 2, rating: 4, title: 'Good' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockReviews);

            const result = await service.getProductReviews('tenant_test', 1);

            expect(result.reviews.length).toBe(2);
        });
    });

    describe('adjustStock', () => {
        it('should adjust stock level', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ stock_on_hand: 100 }]);

            const result = await service.adjustStock('tenant_test', 1, -10, 'Sale');

            expect(result).toBeDefined();
        });
    });

    describe('getLowStockProducts', () => {
        it('should return low stock products', async () => {
            const mockProducts = [
                { id: 1, name: 'Low Stock Product', stock_on_hand: 5 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getLowStockProducts('tenant_test', 10);

            expect(result.length).toBe(1);
        });
    });
});
