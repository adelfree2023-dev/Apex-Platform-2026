/**
 * Wishlist Controller Unit Tests
 * Covers: CRUD, Count, Check, Move to Cart, Clear
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

describe('WishlistController', () => {
    let controller: WishlistController;

    const mockWishlistService = {
        createWishlistTable: jest.fn(),
        getWishlist: jest.fn(),
        getWishlistCount: jest.fn(),
        addToWishlist: jest.fn(),
        removeFromWishlist: jest.fn(),
        isInWishlist: jest.fn(),
        moveToCart: jest.fn(),
        clearWishlist: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WishlistController],
            providers: [
                { provide: WishlistService, useValue: mockWishlistService },
            ],
        }).compile();

        controller = module.get<WishlistController>(WishlistController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateWishlists', () => {
        it('should create wishlist table', async () => {
            mockWishlistService.createWishlistTable.mockResolvedValue(undefined);

            const result = await controller.migrateWishlists('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Wishlist table created');
        });

        it('should handle migration errors', async () => {
            mockWishlistService.createWishlistTable.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateWishlists('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== GET WISHLIST ====================

    describe('getWishlist', () => {
        it('should return customer wishlist', async () => {
            mockWishlistService.getWishlist.mockResolvedValue([
                { id: 1, productId: 10, productName: 'iPhone 15' },
                { id: 2, productId: 20, productName: 'MacBook Pro' },
                { id: 3, productId: 30, productName: 'AirPods Pro' },
            ]);

            const result = await controller.getWishlist('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.count).toBe(3);
        });

        it('should return empty on error', async () => {
            mockWishlistService.getWishlist.mockRejectedValue(new Error());

            const result = await controller.getWishlist('test-store', '100');

            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
        });
    });

    describe('getWishlistCount', () => {
        it('should return wishlist count', async () => {
            mockWishlistService.getWishlistCount.mockResolvedValue(5);

            const result = await controller.getWishlistCount('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.count).toBe(5);
        });

        it('should return 0 on error', async () => {
            mockWishlistService.getWishlistCount.mockRejectedValue(new Error());

            const result = await controller.getWishlistCount('test-store', '100');

            expect(result.count).toBe(0);
        });
    });

    // ==================== ADD TO WISHLIST ====================

    describe('addToWishlist', () => {
        it('should add product to wishlist', async () => {
            mockWishlistService.addToWishlist.mockResolvedValue({
                id: 1,
                productId: 10,
                alreadyExists: false,
            });

            const result = await controller.addToWishlist('test-store', '100', {
                productId: 10,
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('Added to wishlist');
        });

        it('should indicate if already exists', async () => {
            mockWishlistService.addToWishlist.mockResolvedValue({
                id: 1,
                productId: 10,
                alreadyExists: true,
            });

            const result = await controller.addToWishlist('test-store', '100', {
                productId: 10,
            });

            expect(result.message).toContain('Already in wishlist');
        });

        it('should add with variant and notes', async () => {
            mockWishlistService.addToWishlist.mockResolvedValue({
                id: 1,
                productId: 10,
                variantId: 5,
                notes: 'Size M',
            });

            const result = await controller.addToWishlist('test-store', '100', {
                productId: 10,
                variantId: 5,
                notes: 'Size M',
            });

            expect(result.success).toBe(true);
        });

        it('should throw without productId', async () => {
            await expect(controller.addToWishlist('test-store', '100', {
                productId: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== REMOVE FROM WISHLIST ====================

    describe('removeFromWishlist', () => {
        it('should remove product from wishlist', async () => {
            mockWishlistService.removeFromWishlist.mockResolvedValue(undefined);

            const result = await controller.removeFromWishlist('test-store', '100', '10');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Removed from wishlist');
        });

        it('should handle removal errors', async () => {
            mockWishlistService.removeFromWishlist.mockRejectedValue(new Error('Error'));

            await expect(controller.removeFromWishlist('test-store', '100', '10'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CHECK WISHLIST ====================

    describe('isInWishlist', () => {
        it('should return true if in wishlist', async () => {
            mockWishlistService.isInWishlist.mockResolvedValue(true);

            const result = await controller.isInWishlist('test-store', '100', '10');

            expect(result.success).toBe(true);
            expect(result.inWishlist).toBe(true);
        });

        it('should return false if not in wishlist', async () => {
            mockWishlistService.isInWishlist.mockResolvedValue(false);

            const result = await controller.isInWishlist('test-store', '100', '999');

            expect(result.inWishlist).toBe(false);
        });

        it('should return false on error', async () => {
            mockWishlistService.isInWishlist.mockRejectedValue(new Error());

            const result = await controller.isInWishlist('test-store', '100', '10');

            expect(result.inWishlist).toBe(false);
        });
    });

    // ==================== MOVE TO CART ====================

    describe('moveToCart', () => {
        it('should move item to cart', async () => {
            mockWishlistService.moveToCart.mockResolvedValue(undefined);

            const result = await controller.moveToCart('test-store', '100', '10', {
                sessionId: 'session-123',
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('Moved to cart');
        });

        it('should throw without sessionId', async () => {
            await expect(controller.moveToCart('test-store', '100', '10', {
                sessionId: '',
            })).rejects.toThrow(HttpException);
        });

        it('should handle move errors', async () => {
            mockWishlistService.moveToCart.mockRejectedValue(new Error('Product out of stock'));

            await expect(controller.moveToCart('test-store', '100', '10', {
                sessionId: 'session-123',
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== CLEAR WISHLIST ====================

    describe('clearWishlist', () => {
        it('should clear entire wishlist', async () => {
            mockWishlistService.clearWishlist.mockResolvedValue(undefined);

            const result = await controller.clearWishlist('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Wishlist cleared');
        });

        it('should handle clear errors', async () => {
            mockWishlistService.clearWishlist.mockRejectedValue(new Error('Error'));

            await expect(controller.clearWishlist('test-store', '100'))
                .rejects.toThrow(HttpException);
        });
    });
});
