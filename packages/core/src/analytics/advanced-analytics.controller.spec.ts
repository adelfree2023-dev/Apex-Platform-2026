/**
 * Advanced Analytics Controller Unit Tests
 * Covers: RFM, Segments, Trends, Cohorts, Revenue, Abandonment
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { AdvancedAnalyticsService } from './advanced-analytics.service';

describe('AdvancedAnalyticsController', () => {
    let controller: AdvancedAnalyticsController;

    const mockAdvancedAnalyticsService = {
        getRFMAnalysis: jest.fn(),
        getSegmentSummary: jest.fn(),
        getSalesTrends: jest.fn(),
        getProductPerformance: jest.fn(),
        getCohortAnalysis: jest.fn(),
        getRevenueMetrics: jest.fn(),
        getAbandonmentMetrics: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdvancedAnalyticsController],
            providers: [
                { provide: AdvancedAnalyticsService, useValue: mockAdvancedAnalyticsService },
            ],
        }).compile();

        controller = module.get<AdvancedAnalyticsController>(AdvancedAnalyticsController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== RFM ANALYSIS ====================

    describe('getRFMAnalysis', () => {
        it('should return RFM customer segmentation', async () => {
            mockAdvancedAnalyticsService.getRFMAnalysis.mockResolvedValue([
                { customerId: 1, recency: 5, frequency: 4, monetary: 5, segment: 'Champions' },
                { customerId: 2, recency: 3, frequency: 2, monetary: 3, segment: 'Potential Loyalist' },
            ]);

            const result = await controller.getRFMAnalysis('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockAdvancedAnalyticsService.getRFMAnalysis.mockRejectedValue(new Error());

            const result = await controller.getRFMAnalysis('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });
    });

    // ==================== SEGMENT SUMMARY ====================

    describe('getSegmentSummary', () => {
        it('should return segment summary', async () => {
            mockAdvancedAnalyticsService.getSegmentSummary.mockResolvedValue([
                { segment: 'Champions', count: 50, revenue: 100000 },
                { segment: 'At Risk', count: 30, revenue: 25000 },
            ]);

            const result = await controller.getSegmentSummary('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockAdvancedAnalyticsService.getSegmentSummary.mockRejectedValue(new Error());

            const result = await controller.getSegmentSummary('test-store');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== SALES TRENDS ====================

    describe('getSalesTrends', () => {
        it('should return sales trends by day', async () => {
            mockAdvancedAnalyticsService.getSalesTrends.mockResolvedValue([
                { date: '2026-01-14', sales: 5000, orders: 10 },
                { date: '2026-01-15', sales: 7500, orders: 15 },
            ]);

            const result = await controller.getSalesTrends('test-store', 'day', '30');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.period).toBe('day');
        });

        it('should return sales trends by week', async () => {
            mockAdvancedAnalyticsService.getSalesTrends.mockResolvedValue([]);

            const result = await controller.getSalesTrends('test-store', 'week', '12');

            expect(mockAdvancedAnalyticsService.getSalesTrends).toHaveBeenCalledWith(
                'tenant_test_store',
                'week',
                12
            );
        });

        it('should return sales trends by month', async () => {
            mockAdvancedAnalyticsService.getSalesTrends.mockResolvedValue([]);

            await controller.getSalesTrends('test-store', 'month', '6');

            expect(mockAdvancedAnalyticsService.getSalesTrends).toHaveBeenCalledWith(
                'tenant_test_store',
                'month',
                6
            );
        });

        it('should return empty with period on error', async () => {
            mockAdvancedAnalyticsService.getSalesTrends.mockRejectedValue(new Error());

            const result = await controller.getSalesTrends('test-store', 'day', '30');

            expect(result.data).toEqual([]);
            expect(result.period).toBe('day');
        });
    });

    // ==================== PRODUCT PERFORMANCE ====================

    describe('getProductPerformance', () => {
        it('should return product performance', async () => {
            mockAdvancedAnalyticsService.getProductPerformance.mockResolvedValue([
                { productId: 1, name: 'iPhone', sales: 100, revenue: 500000, profit: 100000 },
                { productId: 2, name: 'MacBook', sales: 50, revenue: 300000, profit: 60000 },
            ]);

            const result = await controller.getProductPerformance('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockAdvancedAnalyticsService.getProductPerformance.mockRejectedValue(new Error());

            const result = await controller.getProductPerformance('test-store');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== COHORT ANALYSIS ====================

    describe('getCohortAnalysis', () => {
        it('should return cohort analysis', async () => {
            mockAdvancedAnalyticsService.getCohortAnalysis.mockResolvedValue([
                { cohort: '2026-01', size: 100, retentionRate: [100, 45, 30, 25] },
                { cohort: '2026-02', size: 120, retentionRate: [100, 50, 35] },
            ]);

            const result = await controller.getCohortAnalysis('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockAdvancedAnalyticsService.getCohortAnalysis.mockRejectedValue(new Error());

            const result = await controller.getCohortAnalysis('test-store');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== REVENUE METRICS ====================

    describe('getRevenueMetrics', () => {
        it('should return revenue metrics', async () => {
            mockAdvancedAnalyticsService.getRevenueMetrics.mockResolvedValue({
                totalRevenue: 1000000,
                avgOrderValue: 250,
                revenueGrowth: 15.5,
                ltv: 1200,
            });

            const result = await controller.getRevenueMetrics('test-store');

            expect(result.success).toBe(true);
            expect(result.data.totalRevenue).toBe(1000000);
        });

        it('should return empty object on error', async () => {
            mockAdvancedAnalyticsService.getRevenueMetrics.mockRejectedValue(new Error());

            const result = await controller.getRevenueMetrics('test-store');

            expect(result.data).toEqual({});
        });
    });

    // ==================== ABANDONMENT METRICS ====================

    describe('getAbandonmentMetrics', () => {
        it('should return abandonment metrics', async () => {
            mockAdvancedAnalyticsService.getAbandonmentMetrics.mockResolvedValue({
                totalAbandoned: 150,
                abandonmentRate: 25.5,
                recoveredCarts: 30,
                potentialRevenue: 50000,
            });

            const result = await controller.getAbandonmentMetrics('test-store');

            expect(result.success).toBe(true);
            expect(result.data.abandonmentRate).toBe(25.5);
        });

        it('should return empty object on error', async () => {
            mockAdvancedAnalyticsService.getAbandonmentMetrics.mockRejectedValue(new Error());

            const result = await controller.getAbandonmentMetrics('test-store');

            expect(result.data).toEqual({});
        });
    });

    // ==================== FULL DASHBOARD ====================

    describe('getDashboard', () => {
        it('should return full dashboard data', async () => {
            mockAdvancedAnalyticsService.getRevenueMetrics.mockResolvedValue({
                totalRevenue: 1000000,
            });
            mockAdvancedAnalyticsService.getSegmentSummary.mockResolvedValue([
                { segment: 'Champions', count: 50 },
            ]);
            mockAdvancedAnalyticsService.getSalesTrends.mockResolvedValue([
                { date: '2026-01-14', sales: 5000 },
            ]);
            mockAdvancedAnalyticsService.getProductPerformance.mockResolvedValue([
                { productId: 1, name: 'Product 1' },
                { productId: 2, name: 'Product 2' },
                { productId: 3, name: 'Product 3' },
                { productId: 4, name: 'Product 4' },
                { productId: 5, name: 'Product 5' },
                { productId: 6, name: 'Product 6' },
            ]);
            mockAdvancedAnalyticsService.getAbandonmentMetrics.mockResolvedValue({
                abandonmentRate: 20,
            });

            const result = await controller.getDashboard('test-store');

            expect(result.success).toBe(true);
            expect(result.data.revenue).toBeDefined();
            expect(result.data.segments).toBeDefined();
            expect(result.data.trends).toBeDefined();
            expect(result.data.topProducts).toHaveLength(5); // Sliced to 5
            expect(result.data.abandonment).toBeDefined();
        });

        it('should throw on error', async () => {
            mockAdvancedAnalyticsService.getRevenueMetrics.mockRejectedValue(new Error('Error'));

            await expect(controller.getDashboard('test-store'))
                .rejects.toThrow(HttpException);
        });
    });
});
