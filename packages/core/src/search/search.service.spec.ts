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
                { id: 1, name: 'Honey', slug: 'honey', price: 10000, stock: 50 },
                { id: 2, name: 'Bee Honey', slug: 'bee-honey', price: 15000, stock: 30 },
            ];
            const mockCount = [{ count: 2 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockProducts)
                .mockResolvedValueOnce(mockCount);

            const result = await service.searchProducts('tenant_test', { query: 'honey' });

            expect(result.products).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should filter by price range', async () => {
            const mockProducts = [{ id: 1, name: 'Cheap Item', price: 5000, stock: 10 }];
            const mockCount = [{ count: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockProducts)
                .mockResolvedValueOnce(mockCount);

            const result = await service.searchProducts('tenant_test', {
                minPrice: 1000,
                maxPrice: 10000,
            });

            expect(result.products).toHaveLength(1);
        });

        it('should paginate results', async () => {
            const mockProducts = [{ id: 3, name: 'Page 2 Item', price: 20000, stock: 5 }];
            const mockCount = [{ count: 15 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockProducts)
                .mockResolvedValueOnce(mockCount);

            const result = await service.searchProducts('tenant_test', { page: 2, limit: 10 });

            expect(result.page).toBe(2);
            expect(result.totalPages).toBe(2);
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
    });

    describe('getSearchFacets', () => {
        it('should return search facets', async () => {
            const mockCategories = [{ name: 'Food', slug: 'food', count: 10 }];
            const mockPriceRange = [{ min_price: 1000, max_price: 100000 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCategories)
                .mockResolvedValueOnce(mockPriceRange);

            const result = await service.getSearchFacets('tenant_test');

            expect(result.categories).toHaveLength(1);
            expect(result.priceRange.min).toBe(1000);
        });
    });
});
