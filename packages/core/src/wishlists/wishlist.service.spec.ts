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
                { id: 1, product_id: 456, product_name: 'Product A', price: 10000, stock_on_hand: 50, priority: 1, created_at: new Date() },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockItems);

            const result = await service.getWishlist('tenant_test', 123);

            expect(result).toHaveLength(1);
            expect(result[0].productName).toBe('Product A');
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
    });

    describe('getWishlistCount', () => {
        it('should return wishlist count', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: 5 }]);

            const result = await service.getWishlistCount('tenant_test', 123);

            expect(result).toBe(5);
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
