/**
 * Search Controller Unit Tests
 * Covers: Search, Suggestions, Facets
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
    let controller: SearchController;

    const mockSearchService = {
        searchProducts: jest.fn(),
        getSearchSuggestions: jest.fn(),
        getSearchFacets: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SearchController],
            providers: [
                { provide: SearchService, useValue: mockSearchService },
            ],
        }).compile();

        controller = module.get<SearchController>(SearchController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== SEARCH ====================

    describe('searchProducts', () => {
        it('should search products with query', async () => {
            mockSearchService.searchProducts.mockResolvedValue({
                products: [
                    { id: 1, name: 'iPhone 15', price: 50000 },
                    { id: 2, name: 'iPhone 14', price: 40000 },
                ],
                total: 2,
                page: 1,
                totalPages: 1,
            });

            const result = await controller.searchProducts(
                'test-store', 'iPhone', undefined, undefined, undefined,
                undefined, undefined, undefined, undefined
            );

            expect(result.success).toBe(true);
            expect(result.products).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should search with category filter', async () => {
            mockSearchService.searchProducts.mockResolvedValue({
                products: [{ id: 1, name: 'MacBook', category: 'laptops' }],
                total: 1,
            });

            const result = await controller.searchProducts(
                'test-store', undefined, 'laptops', undefined, undefined,
                undefined, undefined, undefined, undefined
            );

            expect(result.success).toBe(true);
        });

        it('should search with price range', async () => {
            mockSearchService.searchProducts.mockResolvedValue({
                products: [{ id: 1, name: 'Budget Phone', price: 5000 }],
                total: 1,
            });

            const result = await controller.searchProducts(
                'test-store', undefined, undefined, '1000', '10000',
                undefined, undefined, undefined, undefined
            );

            expect(result.success).toBe(true);
            expect(mockSearchService.searchProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                expect.objectContaining({
                    minPrice: 1000,
                    maxPrice: 10000,
                })
            );
        });

        it('should search in stock only', async () => {
            mockSearchService.searchProducts.mockResolvedValue({
                products: [],
                total: 0,
            });

            await controller.searchProducts(
                'test-store', 'phone', undefined, undefined, undefined,
                'true', undefined, undefined, undefined
            );

            expect(mockSearchService.searchProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                expect.objectContaining({ inStock: true })
            );
        });

        it('should support sorting', async () => {
            mockSearchService.searchProducts.mockResolvedValue({
                products: [],
                total: 0,
            });

            await controller.searchProducts(
                'test-store', undefined, undefined, undefined, undefined,
                undefined, 'price_asc', undefined, undefined
            );

            expect(mockSearchService.searchProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                expect.objectContaining({ sortBy: 'price_asc' })
            );
        });

        it('should support pagination', async () => {
            mockSearchService.searchProducts.mockResolvedValue({
                products: [],
                total: 100,
                page: 3,
                totalPages: 5,
            });

            const result = await controller.searchProducts(
                'test-store', 'phone', undefined, undefined, undefined,
                undefined, undefined, '3', '20'
            );

            expect(result.page).toBe(3);
        });

        it('should handle search errors', async () => {
            mockSearchService.searchProducts.mockRejectedValue(new Error('Search failed'));

            await expect(controller.searchProducts(
                'test-store', 'test', undefined, undefined, undefined,
                undefined, undefined, undefined, undefined
            )).rejects.toThrow(HttpException);
        });
    });

    // ==================== SUGGESTIONS ====================

    describe('getSearchSuggestions', () => {
        it('should return search suggestions', async () => {
            mockSearchService.getSearchSuggestions.mockResolvedValue([
                'iphone 15 pro',
                'iphone 15 pro max',
                'iphone 14',
            ]);

            const result = await controller.getSearchSuggestions('test-store', 'iphone');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.query).toBe('iphone');
        });

        it('should limit suggestions', async () => {
            mockSearchService.getSearchSuggestions.mockResolvedValue(['a', 'b']);

            await controller.getSearchSuggestions('test-store', 'test', '2');

            expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith(
                'tenant_test_store', 'test', 2
            );
        });

        it('should return empty on error', async () => {
            mockSearchService.getSearchSuggestions.mockRejectedValue(new Error());

            const result = await controller.getSearchSuggestions('test-store', 'test');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== FACETS ====================

    describe('getSearchFacets', () => {
        it('should return search facets', async () => {
            mockSearchService.getSearchFacets.mockResolvedValue({
                categories: [
                    { slug: 'phones', name: 'Phones', count: 50 },
                    { slug: 'laptops', name: 'Laptops', count: 30 },
                ],
                priceRange: { min: 1000, max: 100000 },
                stockStatus: { inStock: 70, outOfStock: 10 },
            });

            const result = await controller.getSearchFacets('test-store');

            expect(result.success).toBe(true);
            expect(result.data.categories).toHaveLength(2);
            expect(result.data.priceRange.min).toBe(1000);
        });

        it('should return default on error', async () => {
            mockSearchService.getSearchFacets.mockRejectedValue(new Error());

            const result = await controller.getSearchFacets('test-store');

            expect(result.data.categories).toEqual([]);
            expect(result.data.priceRange.min).toBe(0);
        });
    });
});
