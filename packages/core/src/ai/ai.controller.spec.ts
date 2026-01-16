/**
 * AI Controller Unit Tests
 * Covers: Recommendations, Tracking, Insights
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
    let controller: AiController;

    const mockAiService = {
        createAiTables: jest.fn(),
        trackBehavior: jest.fn(),
        getSimilarProducts: jest.fn(),
        getFrequentlyBoughtTogether: jest.fn(),
        getPersonalizedRecommendations: jest.fn(),
        getTrendingProducts: jest.fn(),
        generateInsights: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AiController],
            providers: [
                { provide: AiService, useValue: mockAiService },
            ],
        }).compile();

        controller = module.get<AiController>(AiController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateAi', () => {
        it('should create AI tables', async () => {
            mockAiService.createAiTables.mockResolvedValue(undefined);

            const result = await controller.migrateAi('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('AI tables created');
            expect(mockAiService.createAiTables).toHaveBeenCalledWith('tenant_test_store');
        });

        it('should handle migration errors', async () => {
            mockAiService.createAiTables.mockRejectedValue(new Error('Database error'));

            await expect(controller.migrateAi('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== BEHAVIOR TRACKING ====================

    describe('trackBehavior', () => {
        it('should track customer behavior with customerId', async () => {
            mockAiService.trackBehavior.mockResolvedValue(undefined);

            const result = await controller.trackBehavior('test-store', {
                customerId: 100,
                sessionId: 'session-123',
                productId: 50,
                action: 'view',
            });

            expect(result.success).toBe(true);
            expect(mockAiService.trackBehavior).toHaveBeenCalledWith(
                'tenant_test_store',
                100,
                'session-123',
                50,
                'view'
            );
        });

        it('should track behavior for anonymous user', async () => {
            mockAiService.trackBehavior.mockResolvedValue(undefined);

            const result = await controller.trackBehavior('test-store', {
                sessionId: 'anon-session',
                productId: 25,
                action: 'add_to_cart',
            });

            expect(result.success).toBe(true);
            expect(mockAiService.trackBehavior).toHaveBeenCalledWith(
                'tenant_test_store',
                null,
                'anon-session',
                25,
                'add_to_cart'
            );
        });

        it('should track purchase action', async () => {
            mockAiService.trackBehavior.mockResolvedValue(undefined);

            const result = await controller.trackBehavior('test-store', {
                customerId: 50,
                sessionId: 'session-456',
                productId: 10,
                action: 'purchase',
            });

            expect(result.success).toBe(true);
        });

        it('should return success false on error', async () => {
            mockAiService.trackBehavior.mockRejectedValue(new Error('Error'));

            const result = await controller.trackBehavior('test-store', {
                sessionId: 'session',
                productId: 1,
                action: 'view',
            });

            expect(result.success).toBe(false);
        });
    });

    // ==================== SIMILAR PRODUCTS ====================

    describe('getSimilarProducts', () => {
        it('should return similar products', async () => {
            mockAiService.getSimilarProducts.mockResolvedValue([
                { id: 1, name: 'Product A', similarity: 0.9 },
                { id: 2, name: 'Product B', similarity: 0.85 },
                { id: 3, name: 'Product C', similarity: 0.8 },
            ]);

            const result = await controller.getSimilarProducts('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.count).toBe(3);
        });

        it('should respect custom limit', async () => {
            mockAiService.getSimilarProducts.mockResolvedValue([
                { id: 1, name: 'Product A' },
            ]);

            await controller.getSimilarProducts('test-store', '100', '1');

            expect(mockAiService.getSimilarProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                100,
                1
            );
        });

        it('should use default limit of 6', async () => {
            mockAiService.getSimilarProducts.mockResolvedValue([]);

            await controller.getSimilarProducts('test-store', '100');

            expect(mockAiService.getSimilarProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                100,
                6
            );
        });

        it('should return empty on error', async () => {
            mockAiService.getSimilarProducts.mockRejectedValue(new Error());

            const result = await controller.getSimilarProducts('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
        });
    });

    // ==================== FREQUENTLY BOUGHT TOGETHER ====================

    describe('getFrequentlyBoughtTogether', () => {
        it('should return frequently bought together products', async () => {
            mockAiService.getFrequentlyBoughtTogether.mockResolvedValue([
                { id: 10, name: 'iPhone Case', frequency: 50 },
                { id: 11, name: 'Screen Protector', frequency: 45 },
            ]);

            const result = await controller.getFrequentlyBoughtTogether('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should use default limit of 4', async () => {
            mockAiService.getFrequentlyBoughtTogether.mockResolvedValue([]);

            await controller.getFrequentlyBoughtTogether('test-store', '1');

            expect(mockAiService.getFrequentlyBoughtTogether).toHaveBeenCalledWith(
                'tenant_test_store',
                1,
                4
            );
        });

        it('should respect custom limit', async () => {
            mockAiService.getFrequentlyBoughtTogether.mockResolvedValue([]);

            await controller.getFrequentlyBoughtTogether('test-store', '1', '10');

            expect(mockAiService.getFrequentlyBoughtTogether).toHaveBeenCalledWith(
                'tenant_test_store',
                1,
                10
            );
        });

        it('should return empty on error', async () => {
            mockAiService.getFrequentlyBoughtTogether.mockRejectedValue(new Error());

            const result = await controller.getFrequentlyBoughtTogether('test-store', '1');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== PERSONALIZED RECOMMENDATIONS ====================

    describe('getPersonalizedRecommendations', () => {
        it('should return personalized recommendations for customer', async () => {
            mockAiService.getPersonalizedRecommendations.mockResolvedValue([
                { id: 1, name: 'Recommended Product 1', score: 0.95 },
                { id: 2, name: 'Recommended Product 2', score: 0.90 },
            ]);

            const result = await controller.getPersonalizedRecommendations('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should use default limit of 8', async () => {
            mockAiService.getPersonalizedRecommendations.mockResolvedValue([]);

            await controller.getPersonalizedRecommendations('test-store', '100');

            expect(mockAiService.getPersonalizedRecommendations).toHaveBeenCalledWith(
                'tenant_test_store',
                100,
                8
            );
        });

        it('should respect custom limit', async () => {
            mockAiService.getPersonalizedRecommendations.mockResolvedValue([]);

            await controller.getPersonalizedRecommendations('test-store', '100', '20');

            expect(mockAiService.getPersonalizedRecommendations).toHaveBeenCalledWith(
                'tenant_test_store',
                100,
                20
            );
        });

        it('should return empty on error', async () => {
            mockAiService.getPersonalizedRecommendations.mockRejectedValue(new Error());

            const result = await controller.getPersonalizedRecommendations('test-store', '100');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== TRENDING PRODUCTS ====================

    describe('getTrendingProducts', () => {
        it('should return trending products', async () => {
            mockAiService.getTrendingProducts.mockResolvedValue([
                { id: 1, name: 'Trending 1', views: 1000 },
                { id: 2, name: 'Trending 2', views: 800 },
                { id: 3, name: 'Trending 3', views: 600 },
            ]);

            const result = await controller.getTrendingProducts('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.count).toBe(3);
        });

        it('should use default limit of 8', async () => {
            mockAiService.getTrendingProducts.mockResolvedValue([]);

            await controller.getTrendingProducts('test-store');

            expect(mockAiService.getTrendingProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                8
            );
        });

        it('should respect custom limit', async () => {
            mockAiService.getTrendingProducts.mockResolvedValue([]);

            await controller.getTrendingProducts('test-store', '15');

            expect(mockAiService.getTrendingProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                15
            );
        });

        it('should return empty on error', async () => {
            mockAiService.getTrendingProducts.mockRejectedValue(new Error());

            const result = await controller.getTrendingProducts('test-store');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== AI INSIGHTS ====================

    describe('getInsights', () => {
        it('should return AI insights', async () => {
            mockAiService.generateInsights.mockResolvedValue([
                { type: 'sales', message: 'Sales increased 20% this week', priority: 'high' },
                { type: 'inventory', message: 'Low stock alert', priority: 'medium' },
            ]);

            const result = await controller.getInsights('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockAiService.generateInsights.mockRejectedValue(new Error());

            const result = await controller.getInsights('test-store');

            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
        });
    });
});
