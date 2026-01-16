/**
 * Search Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService', () => {
    let service: SearchService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SearchService>(SearchService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('searchProducts', () => {
        it('should search products with query', async () => {
            const mockProducts = [
                { id: 1, name: 'Honey', slug: 'honey', variant_id: 1, price: 10000, stock_on_hand: 50, order_count: 5 },
                { id: 2, name: 'Bee Honey', slug: 'bee-honey', variant_id: 2, price: 15000, stock_on_hand: 30, order_count: 3 },
            ];
            const mockCount = [{ total: 2 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCount)
                .mockResolvedValueOnce(mockProducts);

            const result = await service.searchProducts('tenant_test', { query: 'honey' });

            expect(result.products.length).toBeGreaterThan(0);
        });

        it('should filter by price range', async () => {
            const mockProducts = [{ id: 1, name: 'Cheap Item', variant_id: 1, price: 5000, stock_on_hand: 10, order_count: 1 }];
            const mockCount = [{ total: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCount)
                .mockResolvedValueOnce(mockProducts);

            const result = await service.searchProducts('tenant_test', {
                minPrice: 1000,
                maxPrice: 10000,
            });

            expect(result.products).toHaveLength(1);
        });

        it('should paginate results', async () => {
            const mockProducts = [{ id: 3, name: 'Page 2 Item', variant_id: 3, price: 20000, stock_on_hand: 5, order_count: 0 }];
            const mockCount = [{ total: 15 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCount)
                .mockResolvedValueOnce(mockProducts);

            const result = await service.searchProducts('tenant_test', { page: 2, limit: 10 });

            expect(result.page).toBe(2);
            expect(result.products.length).toBeGreaterThan(0);
        });

        it('should filter by category slug', async () => {
            const mockProducts = [{ id: 1, name: 'Category Item' }];
            const mockCount = [{ total: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCount) // Count query
                .mockResolvedValueOnce(mockProducts); // Product query

            const result = await service.searchProducts('tenant_test', { categorySlug: 'food' });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('c.slug = $'),
                expect.any(String) // matches 'food'
            );
            expect(result.products).toHaveLength(1);
        });

        it('should filter by inStock', async () => {
            const mockProducts = [{ id: 1, name: 'Stock Item' }];
            const mockCount = [{ total: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCount)
                .mockResolvedValueOnce(mockProducts);

            await service.searchProducts('tenant_test', { inStock: true });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('pv.stock_on_hand > 0'),
                expect.any(Number), // limit
                expect.any(Number)  // offset
            );
        });

        it('should apply sorting', async () => {
            const mockProducts = [];
            const mockCount = [{ total: 0 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCount)
                .mockResolvedValueOnce(mockProducts);

            await service.searchProducts('tenant_test', { sortBy: 'price_desc' });

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY pv.price DESC'),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('should handle search errors gracefully', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'));

            const result = await service.searchProducts('tenant_test', { query: 'fail' });

            expect(result.products).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('getSearchSuggestions', () => {
        it('should return search suggestions', async () => {
            const mockSuggestions = [
                { name: 'Honey' },
                { name: 'Honeycomb' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockSuggestions);

            const result = await service.getSearchSuggestions('tenant_test', 'hon');

            expect(result).toContain('Honey');
            expect(result).toContain('Honeycomb');
        });

        it('should return empty if query is too short', async () => {
            const result = await service.getSearchSuggestions('tenant_test', 'a');
            expect(result).toEqual([]);
        });

        it('should handle db errors gracefully', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'));
            const result = await service.getSearchSuggestions('tenant_test', 'error');
            expect(result).toEqual([]);
        });
    });

    describe('getSearchFacets', () => {
        it('should return search facets', async () => {
            const mockCategories = [{ name: 'Food', slug: 'food', count: 10 }];
            const mockPriceRange = [{ min_price: 1000, max_price: 100000 }];
            const mockStock = [{ in_stock: 5, out_of_stock: 2 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCategories)
                .mockResolvedValueOnce(mockPriceRange)
                .mockResolvedValueOnce(mockStock);

            const result = await service.getSearchFacets('tenant_test');

            expect(result.categories).toHaveLength(1);
            expect(result.priceRange.min).toBe(1000);
        });

        it('should handle db errors gracefully', async () => {
            // Mock failures for all facet queries if possible, or just the first one throwing
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'));

            const result = await service.getSearchFacets('tenant_test');

            expect(result.categories).toEqual([]);
            expect(result.priceRange.min).toBe(0);
        });
    });
});
