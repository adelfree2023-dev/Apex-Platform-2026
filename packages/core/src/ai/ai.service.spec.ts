/**
 * AI Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiService', () => {
    let service: AiService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<AiService>(AiService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAiTables', () => {
        it('should create all AI tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createAiTables('tenant_test');

            // Should create 3 tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(3);
        });
    });

    describe('trackBehavior', () => {
        it('should track customer behavior', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.trackBehavior('tenant_test', 123, 'session-abc', 1, 'view');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });

        it('should track anonymous behavior', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.trackBehavior('tenant_test', null, 'session-xyz', 1, 'add_cart');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getSimilarProducts', () => {
        it('should return similar products', async () => {
            const mockProduct = [{ id: 1, category_id: 5 }];
            const mockSimilar = [
                { id: 2, name: 'Similar A', slug: 'similar-a', price: 10000, stock_on_hand: 50 },
                { id: 3, name: 'Similar B', slug: 'similar-b', price: 15000, stock_on_hand: 30 },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockProduct)
                .mockResolvedValueOnce(mockSimilar);

            const result = await service.getSimilarProducts('tenant_test', 1, 6);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Similar A');
            expect(result[0].reason).toBe('Similar products');
        });

        it('should return empty array if product not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getSimilarProducts('tenant_test', 999);

            expect(result).toEqual([]);
        });
    });

    describe('getFrequentlyBoughtTogether', () => {
        it('should return frequently bought together products', async () => {
            const mockProducts = [
                { id: 2, name: 'Bought Together A', slug: 'together-a', price: 5000, co_occurrence: 10 },
                { id: 3, name: 'Bought Together B', slug: 'together-b', price: 8000, co_occurrence: 7 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getFrequentlyBoughtTogether('tenant_test', 1, 4);

            expect(result).toHaveLength(2);
            expect(result[0].reason).toBe('Frequently bought together');
        });
    });

    describe('getPersonalizedRecommendations', () => {
        it('should return personalized recommendations based on behavior', async () => {
            const mockBehavior = [
                { product_id: 1, action: 'view' },
                { product_id: 2, action: 'add_cart' },
            ];
            const mockRecommendations = [
                { id: 5, name: 'Recommended A', slug: 'rec-a', price: 20000 },
                { id: 6, name: 'Recommended B', slug: 'rec-b', price: 25000 },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockBehavior)
                .mockResolvedValueOnce(mockRecommendations);

            const result = await service.getPersonalizedRecommendations('tenant_test', 123, 8);

            expect(result).toHaveLength(2);
            expect(result[0].reason).toBe('Recommended for you');
        });

        it('should return trending products if no behavior history', async () => {
            const mockTrending = [
                { id: 10, name: 'Trending A', slug: 'trend-a', price: 15000, order_count: 50 },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No behavior
                .mockResolvedValueOnce(mockTrending);

            const result = await service.getPersonalizedRecommendations('tenant_test', 456, 8);

            expect(result[0].reason).toBe('Trending now');
        });
    });

    describe('getTrendingProducts', () => {
        it('should return trending products by order count', async () => {
            const mockTrending = [
                { id: 1, name: 'Hot Product', slug: 'hot', price: 30000, order_count: 100 },
                { id: 2, name: 'Popular Item', slug: 'popular', price: 25000, order_count: 80 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockTrending);

            const result = await service.getTrendingProducts('tenant_test', 8);

            expect(result).toHaveLength(2);
            expect(result[0].orderCount).toBe(100);
            expect(result[0].reason).toBe('Trending now');
        });
    });

    describe('generateInsights', () => {
        it('should generate low stock insight', async () => {
            const mockLowStock = [{ count: 5 }];
            const mockAbandoned = [{ count: 0 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockLowStock)
                .mockResolvedValueOnce(mockAbandoned);

            const result = await service.generateInsights('tenant_test');

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('low_stock');
            expect(result[0].priority).toBe(8);
        });

        it('should generate abandoned cart insight', async () => {
            const mockLowStock = [{ count: 0 }];
            const mockAbandoned = [{ count: 10 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockLowStock)
                .mockResolvedValueOnce(mockAbandoned);

            const result = await service.generateInsights('tenant_test');

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('abandoned_carts');
        });

        it('should generate multiple insights', async () => {
            const mockLowStock = [{ count: 3 }];
            const mockAbandoned = [{ count: 7 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockLowStock)
                .mockResolvedValueOnce(mockAbandoned);

            const result = await service.generateInsights('tenant_test');

            expect(result).toHaveLength(2);
        });
    });
});
