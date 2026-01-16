/**
 * Advanced Analytics Service Unit Tests
 * Root-analyzed: Uses PrismaService with $queryRawUnsafe
 * Methods: getRFMAnalysis, getSegmentSummary, getSalesTrends, getProductPerformance, getCohortAnalysis, getRevenueMetrics, getAbandonmentMetrics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdvancedAnalyticsService', () => {
    let service: AdvancedAnalyticsService;

    const mockPrismaService = {
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdvancedAnalyticsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AdvancedAnalyticsService>(AdvancedAnalyticsService);
        jest.clearAllMocks();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== RFM ANALYSIS ====================

    describe('getRFMAnalysis', () => {
        it('should return RFM customer segmentation', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                {
                    customer_id: BigInt(1),
                    email: 'vip@example.com',
                    days_since_last_order: 5,
                    order_count: BigInt(20),
                    total_spent: 100000,
                },
                {
                    customer_id: BigInt(2),
                    email: 'regular@example.com',
                    days_since_last_order: 30,
                    order_count: BigInt(5),
                    total_spent: 10000,
                },
            ]);

            const result = await service.getRFMAnalysis('tenant_test_store');

            expect(result).toHaveLength(2);
            expect(result[0].customerId).toBe(1);
            expect(result[0].email).toBe('vip@example.com');
            expect(result[0]).toHaveProperty('rScore');
            expect(result[0]).toHaveProperty('fScore');
            expect(result[0]).toHaveProperty('mScore');
            expect(result[0]).toHaveProperty('segment');
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getRFMAnalysis('tenant_test_store');

            expect(result).toEqual([]);
        });

        it('should handle empty customer list', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getRFMAnalysis('tenant_test_store');

            expect(result).toEqual([]);
        });
    });

    // ==================== SEGMENT SUMMARY ====================

    describe('getSegmentSummary', () => {
        it('should return customer segment summary', async () => {
            // Mock RFM data first
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { customer_id: BigInt(1), email: 'a@test.com', days_since_last_order: 5, order_count: BigInt(10), total_spent: 50000 },
                { customer_id: BigInt(2), email: 'b@test.com', days_since_last_order: 100, order_count: BigInt(1), total_spent: 1000 },
            ]);

            const result = await service.getSegmentSummary('tenant_test_store');

            expect(result).toBeInstanceOf(Array);
        });

        it('should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getSegmentSummary('tenant_test_store');

            expect(result).toEqual([]);
        });
    });

    // ==================== SALES TRENDS ====================

    describe('getSalesTrends', () => {
        it('should return daily sales trends', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { period: '2026-01-14', order_count: BigInt(10), total_revenue: 50000 },
                { period: '2026-01-15', order_count: BigInt(15), total_revenue: 75000 },
            ]);

            const result = await service.getSalesTrends('tenant_test_store', 'day', 30);

            expect(result).toHaveLength(2);
            expect(result[0].period).toBe('2026-01-14');
        });

        it('should support weekly period', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getSalesTrends('tenant_test_store', 'week', 12);

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('week'),
                expect.any(Number)
            );
        });

        it('should support monthly period', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getSalesTrends('tenant_test_store', 'month', 6);

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('month'),
                expect.any(Number)
            );
        });

        it('should use default 30 days', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getSalesTrends('tenant_test_store');

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                30
            );
        });

        it('should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getSalesTrends('tenant_test_store');

            expect(result).toEqual([]);
        });
    });

    // ==================== PRODUCT PERFORMANCE ====================

    describe('getProductPerformance', () => {
        it('should return product performance metrics', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { product_id: BigInt(1), name: 'iPhone 15', sku: 'IP15-256', total_sold: BigInt(100), total_revenue: 500000, avg_rating: 4.5 },
                { product_id: BigInt(2), name: 'MacBook Pro', sku: 'MBP-M3', total_sold: BigInt(50), total_revenue: 400000, avg_rating: 4.8 },
            ]);

            const result = await service.getProductPerformance('tenant_test_store');

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('productId');
            expect(result[0]).toHaveProperty('name');
        });

        it('should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getProductPerformance('tenant_test_store');

            expect(result).toEqual([]);
        });
    });

    // ==================== COHORT ANALYSIS ====================

    describe('getCohortAnalysis', () => {
        it('should return customer cohort analysis', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { cohort_month: '2026-01', customer_count: BigInt(100), returning_count: BigInt(45), total_revenue: 150000 },
                { cohort_month: '2025-12', customer_count: BigInt(80), returning_count: BigInt(32), total_revenue: 120000 },
            ]);

            const result = await service.getCohortAnalysis('tenant_test_store');

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('cohortMonth');
        });

        it('should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getCohortAnalysis('tenant_test_store');

            expect(result).toEqual([]);
        });
    });

    // ==================== REVENUE METRICS ====================

    describe('getRevenueMetrics', () => {
        it('should return comprehensive revenue metrics', async () => {
            // Mock multiple queries for different metrics
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ total: 1000000, avg: 2500, count: BigInt(400) }]) // revenue summary
                .mockResolvedValueOnce([{ total: 800000 }]) // previous period
                .mockResolvedValueOnce([{ avg_customer_value: 5000 }]); // CLV

            const result = await service.getRevenueMetrics('tenant_test_store');

            expect(result).toHaveProperty('totalRevenue');
            expect(result).toHaveProperty('averageOrderValue');
        });

        it('should handle missing data gracefully', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{}]);

            const result = await service.getRevenueMetrics('tenant_test_store');

            expect(result).toHaveProperty('totalRevenue');
        });

        it('should return empty object on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getRevenueMetrics('tenant_test_store');

            expect(result).toEqual({});
        });
    });

    // ==================== ABANDONMENT METRICS ====================

    describe('getAbandonmentMetrics', () => {
        it('should return cart abandonment metrics', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                total_carts: BigInt(500),
                abandoned_carts: BigInt(150),
                abandoned_value: 75000,
            }]);

            const result = await service.getAbandonmentMetrics('tenant_test_store');

            expect(result).toHaveProperty('totalCarts');
            expect(result).toHaveProperty('abandonedCarts');
            expect(result).toHaveProperty('abandonmentRate');
        });

        it('should handle zero carts', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                total_carts: BigInt(0),
                abandoned_carts: BigInt(0),
                abandoned_value: 0,
            }]);

            const result = await service.getAbandonmentMetrics('tenant_test_store');

            expect(result.abandonmentRate).toBe(0);
        });

        it('should return empty object on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getAbandonmentMetrics('tenant_test_store');

            expect(result).toEqual({});
        });
    });
});
