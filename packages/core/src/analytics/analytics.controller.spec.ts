/**
 * Analytics Controller Unit Tests
 * Covers: Overview, Revenue, Orders, Products, Customers, Wallet, Conversion
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
    let controller: AnalyticsController;

    const mockAnalyticsService = {
        getOverviewStats: jest.fn(),
        getRevenueByPeriod: jest.fn(),
        getOrdersByStatus: jest.fn(),
        getTopProducts: jest.fn(),
        getRecentOrders: jest.fn(),
        getCustomerGrowth: jest.fn(),
        getWalletStats: jest.fn(),
        getConversionMetrics: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalyticsController],
            providers: [
                { provide: AnalyticsService, useValue: mockAnalyticsService },
            ],
        }).compile();

        controller = module.get<AnalyticsController>(AnalyticsController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== OVERVIEW STATS ====================

    describe('getOverviewStats', () => {
        it('should return overview stats', async () => {
            mockAnalyticsService.getOverviewStats.mockResolvedValue({
                totalOrders: 500,
                totalRevenue: 150000,
                totalCustomers: 200,
                averageOrderValue: 300,
            });

            const result = await controller.getOverviewStats('test-store');

            expect(result.success).toBe(true);
            expect(result.data.totalOrders).toBe(500);
            expect(result.data.totalRevenue).toBe(150000);
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getOverviewStats.mockRejectedValue(new Error('Database error'));

            await expect(controller.getOverviewStats('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== REVENUE BY PERIOD ====================

    describe('getRevenueByPeriod', () => {
        it('should return revenue by day', async () => {
            mockAnalyticsService.getRevenueByPeriod.mockResolvedValue([
                { date: '2026-01-14', revenue: 5000, orders: 10 },
                { date: '2026-01-15', revenue: 7500, orders: 15 },
            ]);

            const result = await controller.getRevenueByPeriod('test-store', 'day', '30');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.period).toBe('day');
        });

        it('should return revenue by week', async () => {
            mockAnalyticsService.getRevenueByPeriod.mockResolvedValue([]);

            const result = await controller.getRevenueByPeriod('test-store', 'week', '12');

            expect(mockAnalyticsService.getRevenueByPeriod).toHaveBeenCalledWith(
                'tenant_test_store',
                'week',
                12
            );
        });

        it('should return revenue by month', async () => {
            mockAnalyticsService.getRevenueByPeriod.mockResolvedValue([]);

            await controller.getRevenueByPeriod('test-store', 'month', '6');

            expect(mockAnalyticsService.getRevenueByPeriod).toHaveBeenCalledWith(
                'tenant_test_store',
                'month',
                6
            );
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getRevenueByPeriod.mockRejectedValue(new Error('Error'));

            await expect(controller.getRevenueByPeriod('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== ORDERS BY STATUS ====================

    describe('getOrdersByStatus', () => {
        it('should return orders by status', async () => {
            mockAnalyticsService.getOrdersByStatus.mockResolvedValue([
                { status: 'pending', count: 20 },
                { status: 'shipped', count: 50 },
                { status: 'delivered', count: 100 },
            ]);

            const result = await controller.getOrdersByStatus('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
        });

        it('should return empty array on error with warning', async () => {
            mockAnalyticsService.getOrdersByStatus.mockRejectedValue(new Error());

            const result = await controller.getOrdersByStatus('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.warning).toBeDefined();
        });
    });

    // ==================== TOP PRODUCTS ====================

    describe('getTopProducts', () => {
        it('should return top products', async () => {
            mockAnalyticsService.getTopProducts.mockResolvedValue([
                { id: 1, name: 'iPhone 15', sales: 50, revenue: 250000 },
                { id: 2, name: 'MacBook Pro', sales: 30, revenue: 180000 },
            ]);

            const result = await controller.getTopProducts('test-store', '10');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should use custom limit', async () => {
            mockAnalyticsService.getTopProducts.mockResolvedValue([]);

            await controller.getTopProducts('test-store', '5');

            expect(mockAnalyticsService.getTopProducts).toHaveBeenCalledWith(
                'tenant_test_store',
                5
            );
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getTopProducts.mockRejectedValue(new Error());

            await expect(controller.getTopProducts('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== RECENT ORDERS ====================

    describe('getRecentOrders', () => {
        it('should return recent orders', async () => {
            mockAnalyticsService.getRecentOrders.mockResolvedValue([
                { id: 1001, customer: 'Ahmed', total: 500, status: 'pending' },
                { id: 1002, customer: 'Mohamed', total: 750, status: 'shipped' },
            ]);

            const result = await controller.getRecentOrders('test-store', '10');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should use custom limit', async () => {
            mockAnalyticsService.getRecentOrders.mockResolvedValue([]);

            await controller.getRecentOrders('test-store', '20');

            expect(mockAnalyticsService.getRecentOrders).toHaveBeenCalledWith(
                'tenant_test_store',
                20
            );
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getRecentOrders.mockRejectedValue(new Error());

            await expect(controller.getRecentOrders('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CUSTOMER GROWTH ====================

    describe('getCustomerGrowth', () => {
        it('should return customer growth data', async () => {
            mockAnalyticsService.getCustomerGrowth.mockResolvedValue([
                { date: '2026-01-01', newCustomers: 5 },
                { date: '2026-01-02', newCustomers: 8 },
            ]);

            const result = await controller.getCustomerGrowth('test-store', '30');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should use custom days parameter', async () => {
            mockAnalyticsService.getCustomerGrowth.mockResolvedValue([]);

            await controller.getCustomerGrowth('test-store', '60');

            expect(mockAnalyticsService.getCustomerGrowth).toHaveBeenCalledWith(
                'tenant_test_store',
                60
            );
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getCustomerGrowth.mockRejectedValue(new Error());

            await expect(controller.getCustomerGrowth('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== WALLET STATS ====================

    describe('getWalletStats', () => {
        it('should return wallet stats', async () => {
            mockAnalyticsService.getWalletStats.mockResolvedValue({
                totalBalance: 50000,
                totalTransactions: 200,
                avgBalance: 250,
            });

            const result = await controller.getWalletStats('test-store');

            expect(result.success).toBe(true);
            expect(result.data.totalBalance).toBe(50000);
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getWalletStats.mockRejectedValue(new Error());

            await expect(controller.getWalletStats('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CONVERSION METRICS ====================

    describe('getConversionMetrics', () => {
        it('should return conversion metrics', async () => {
            mockAnalyticsService.getConversionMetrics.mockResolvedValue({
                visitorToCartRate: 15.5,
                cartToCheckoutRate: 45.2,
                checkoutToOrderRate: 80.0,
                overallConversionRate: 5.6,
            });

            const result = await controller.getConversionMetrics('test-store');

            expect(result.success).toBe(true);
            expect(result.data.visitorToCartRate).toBe(15.5);
        });

        it('should throw on error', async () => {
            mockAnalyticsService.getConversionMetrics.mockRejectedValue(new Error());

            await expect(controller.getConversionMetrics('test-store'))
                .rejects.toThrow(HttpException);
        });
    });
});
