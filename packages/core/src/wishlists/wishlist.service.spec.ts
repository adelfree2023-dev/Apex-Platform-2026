/**
 * Wishlist Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WishlistService', () => {
    let service: WishlistService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WishlistService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<WishlistService>(WishlistService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createWishlistTable', () => {
        it('should create wishlist table', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createWishlistTable('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('addToWishlist', () => {
        it('should add product to wishlist', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

            const result = await service.addToWishlist('tenant_test', 123, 456);

            expect(result.success).toBe(true);
            expect(result.id).toBe(1);
        });

        it('should return alreadyExists if product already in wishlist', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.addToWishlist('tenant_test', 123, 456);

            expect(result.success).toBe(true);
            expect(result.alreadyExists).toBe(true);
        });
    });

    it('should throw error on failure', async () => {
        mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

        await expect(service.addToWishlist('tenant_test', 123, 456))
            .rejects.toThrow('DB error');
    });
});

describe('removeFromWishlist', () => {
    it('should remove product from wishlist', async () => {
        mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

        await service.removeFromWishlist('tenant_test', 123, 456);

        expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
    });
});

describe('getWishlist', () => {
    it('should return customer wishlist', async () => {
        const mockItems = [
            {
                id: 1,
                product_id: 456,
                product_variant_id: 789,
                product_name: 'Product A',
                product_slug: 'product-a',
                price: 10000,
                stock_on_hand: 50,
                sku: 'SKU123',
                notes: 'Some notes',
                priority: 1,
                created_at: new Date()
            },
        ];

        mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockItems);

        const result = await service.getWishlist('tenant_test', 123);

        expect(result).toHaveLength(1);
        expect(result[0].productName).toBe('Product A');
        expect(result[0].productVariantId).toBe(789);
        expect(result[0].inStock).toBe(true);
    });

    it('should return empty array on error', async () => {
        mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

        const result = await service.getWishlist('tenant_test', 123);

        expect(result).toEqual([]);
    });
});

describe('isInWishlist', () => {
    it('should return true if product in wishlist', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);

        const result = await service.isInWishlist('tenant_test', 123, 456);

        expect(result).toBe(true);
    });

    it('should return false if product not in wishlist', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        const result = await service.isInWishlist('tenant_test', 123, 456);

        expect(result).toBe(false);
    });

    it('should return false on error', async () => {
        mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

        const result = await service.isInWishlist('tenant_test', 123, 456);

        expect(result).toBe(false);
    });
});

describe('getWishlistCount', () => {
    it('should return wishlist count', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: 5 }]);

        const result = await service.getWishlistCount('tenant_test', 123);

        expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
        mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

        const result = await service.getWishlistCount('tenant_test', 123);

        expect(result).toBe(0);
    });
});

describe('moveToCart', () => {
    it('should move item to cart and remove from wishlist', async () => {
        // 1. Get wishlist item
        mockPrismaService.$queryRawUnsafe
            .mockResolvedValueOnce([{ product_variant_id: 789 }]) // item lookup
            .mockResolvedValueOnce(undefined); // not used if variant exists

        mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

        await service.moveToCart('tenant_test', 123, 456, 'session_123');

        expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO "tenant_test"."vendure_cart"'),
            'session_123', 789
        );
        // Verify removal (second executeRawUnsafe call)
        expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM "tenant_test"."vendure_wishlist"'),
            123, 456
        );
    });

    it('should use default variant if wishlist item has no variant_id', async () => {
        mockPrismaService.$queryRawUnsafe
            .mockResolvedValueOnce([{ product_variant_id: null }]) // item lookup
            .mockResolvedValueOnce([{ id: 999 }]); // default variant lookup

        mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

        await service.moveToCart('tenant_test', 123, 456, 'session_123');

        expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledTimes(2);
        expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
            expect.any(String),
            'session_123', 999
        );
    });

    it('should throw if item not in wishlist', async () => {
        mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

        await expect(service.moveToCart('tenant_test', 123, 456, 'session_123'))
            .rejects.toThrow('Item not in wishlist');
    });

    it('should throw if no variant found and no variant_id in wishlist', async () => {
        mockPrismaService.$queryRawUnsafe
            .mockResolvedValueOnce([{ product_variant_id: null }])
            .mockResolvedValueOnce([]);

        await expect(service.moveToCart('tenant_test', 123, 456, 'session_123'))
            .rejects.toThrow('No variant found');
    });
});

describe('clearWishlist', () => {
    it('should clear wishlist', async () => {
        mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

        await service.clearWishlist('tenant_test', 123);

        expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
    });
});

describe('updatePriority', () => {
    it('should update item priority', async () => {
        mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

        await service.updatePriority('tenant_test', 123, 456, 10);

        expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
    });
});
});
