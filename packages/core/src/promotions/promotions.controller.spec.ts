/**
 * Promotions Controller Unit Tests
 * Covers: Coupons, Reviews, Inventory
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

describe('PromotionsController', () => {
    let controller: PromotionsController;

    const mockPromotionsService = {
        createPromotionsTables: jest.fn(),
        createCoupon: jest.fn(),
        validateCoupon: jest.fn(),
        getCoupons: jest.fn(),
        deleteCoupon: jest.fn(),
        createReview: jest.fn(),
        getProductReviews: jest.fn(),
        adjustStock: jest.fn(),
        getInventoryHistory: jest.fn(),
        getLowStockProducts: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PromotionsController],
            providers: [
                { provide: PromotionsService, useValue: mockPromotionsService },
            ],
        }).compile();

        controller = module.get<PromotionsController>(PromotionsController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migratePromotions', () => {
        it('should create promotions tables', async () => {
            mockPromotionsService.createPromotionsTables.mockResolvedValue(undefined);

            const result = await controller.migratePromotions('test-store');

            expect(result.success).toBe(true);
        });

        it('should handle migration errors', async () => {
            mockPromotionsService.createPromotionsTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migratePromotions('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== COUPONS ====================

    describe('createCoupon', () => {
        it('should create coupon', async () => {
            mockPromotionsService.createCoupon.mockResolvedValue({
                id: 1,
                code: 'SAVE20',
                discountType: 'percentage',
                discountValue: 20,
            });

            const result = await controller.createCoupon('test-store', {
                code: 'SAVE20',
                discountType: 'percentage',
                discountValue: 20,
            });

            expect(result.success).toBe(true);
            expect(result.data.code).toBe('SAVE20');
        });

        it('should throw without code', async () => {
            await expect(controller.createCoupon('test-store', {
                code: '',
                discountType: 'percentage',
                discountValue: 10,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('validateCoupon', () => {
        it('should validate valid coupon', async () => {
            mockPromotionsService.validateCoupon.mockResolvedValue({
                valid: true,
                discount: 100,
                discountType: 'fixed',
            });

            const result = await controller.validateCoupon('test-store', 'SAVE100', '500');

            expect(result.success).toBe(true);
            expect(result.data.valid).toBe(true);
            expect(result.data.discount).toBe(100);
        });

        it('should return invalid for expired coupon', async () => {
            mockPromotionsService.validateCoupon.mockResolvedValue({
                valid: false,
                reason: 'Coupon expired',
            });

            const result = await controller.validateCoupon('test-store', 'EXPIRED', '500');

            expect(result.data.valid).toBe(false);
        });
    });

    describe('getCoupons', () => {
        it('should return all coupons', async () => {
            mockPromotionsService.getCoupons.mockResolvedValue([
                { id: 1, code: 'SAVE10' },
                { id: 2, code: 'SAVE20' },
            ]);

            const result = await controller.getCoupons('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockPromotionsService.getCoupons.mockRejectedValue(new Error());

            const result = await controller.getCoupons('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('deleteCoupon', () => {
        it('should delete coupon', async () => {
            mockPromotionsService.deleteCoupon.mockResolvedValue(undefined);

            const result = await controller.deleteCoupon('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.message).toContain('deleted');
        });
    });

    // ==================== REVIEWS ====================

    describe('createReview', () => {
        it('should create product review', async () => {
            mockPromotionsService.createReview.mockResolvedValue({
                id: 1,
                rating: 5,
                title: 'Great!',
                approved: false,
            });

            const result = await controller.createReview('test-store', '100', {
                customerId: 1,
                rating: 5,
                title: 'Great!',
                comment: 'Excellent product',
            });

            expect(result.success).toBe(true);
            expect(result.data.rating).toBe(5);
        });

        it('should throw without customerId', async () => {
            await expect(controller.createReview('test-store', '100', {
                customerId: undefined as any,
                rating: 5,
            })).rejects.toThrow(HttpException);
        });

        it('should throw for invalid rating', async () => {
            await expect(controller.createReview('test-store', '100', {
                customerId: 1,
                rating: 6,
            })).rejects.toThrow(HttpException);
        });

        it('should throw for rating below 1', async () => {
            await expect(controller.createReview('test-store', '100', {
                customerId: 1,
                rating: 0,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getProductReviews', () => {
        it('should return product reviews', async () => {
            mockPromotionsService.getProductReviews.mockResolvedValue({
                reviews: [
                    { id: 1, rating: 5, title: 'Great' },
                    { id: 2, rating: 4, title: 'Good' },
                ],
                avgRating: 4.5,
                count: 2,
            });

            const result = await controller.getProductReviews('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.avgRating).toBe(4.5);
            expect(result.reviews).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockPromotionsService.getProductReviews.mockRejectedValue(new Error());

            const result = await controller.getProductReviews('test-store', '100');

            expect(result.reviews).toEqual([]);
        });
    });

    // ==================== INVENTORY ====================

    describe('adjustStock', () => {
        it('should adjust stock positively', async () => {
            mockPromotionsService.adjustStock.mockResolvedValue({
                newStock: 150,
            });

            const result = await controller.adjustStock('test-store', '10', {
                adjustment: 50,
                reason: 'Restocking',
            });

            expect(result.success).toBe(true);
            expect(result.data.newStock).toBe(150);
        });

        it('should adjust stock negatively', async () => {
            mockPromotionsService.adjustStock.mockResolvedValue({
                newStock: 80,
            });

            const result = await controller.adjustStock('test-store', '10', {
                adjustment: -20,
                reason: 'Damaged items',
            });

            expect(result.data.newStock).toBe(80);
        });

        it('should throw without adjustment', async () => {
            await expect(controller.adjustStock('test-store', '10', {
                adjustment: undefined as any,
                reason: 'Test',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without reason', async () => {
            await expect(controller.adjustStock('test-store', '10', {
                adjustment: 10,
                reason: '',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getInventoryHistory', () => {
        it('should return inventory history', async () => {
            mockPromotionsService.getInventoryHistory.mockResolvedValue([
                { id: 1, adjustment: 100, reason: 'Initial stock' },
                { id: 2, adjustment: -5, reason: 'Sale' },
            ]);

            const result = await controller.getInventoryHistory('test-store', '10');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockPromotionsService.getInventoryHistory.mockRejectedValue(new Error());

            const result = await controller.getInventoryHistory('test-store', '10');

            expect(result.data).toEqual([]);
        });
    });

    describe('getLowStockProducts', () => {
        it('should return low stock products', async () => {
            mockPromotionsService.getLowStockProducts.mockResolvedValue([
                { id: 1, name: 'Product A', stock: 3 },
                { id: 2, name: 'Product B', stock: 5 },
            ]);

            const result = await controller.getLowStockProducts('test-store', '10');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should use default threshold', async () => {
            mockPromotionsService.getLowStockProducts.mockResolvedValue([]);

            await controller.getLowStockProducts('test-store');

            expect(mockPromotionsService.getLowStockProducts).toHaveBeenCalled();
        });

        it('should return empty on error', async () => {
            mockPromotionsService.getLowStockProducts.mockRejectedValue(new Error());

            const result = await controller.getLowStockProducts('test-store');

            expect(result.data).toEqual([]);
        });
    });
});
