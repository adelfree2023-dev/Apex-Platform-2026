/**
 * Analytics Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
    let service: AnalyticsService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getOverviewStats', () => {
        it('should return overview statistics', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ total_revenue: 1000000, order_count: 50 }])
                .mockResolvedValueOnce([{ customer_count: 200 }])
                .mockResolvedValueOnce([{ product_count: 100 }])
                .mockResolvedValueOnce([{ count: 5 }]);

            const result = await service.getOverviewStats('tenant_test');

            expect(result).toBeDefined();
        });
    });

    describe('getRevenueByPeriod', () => {
        it('should return revenue by day', async () => {
            const mockData = [
                { period: '2026-01-01', total: 50000, count: 5 },
                { period: '2026-01-02', total: 75000, count: 8 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

            const result = await service.getRevenueByPeriod('tenant_test', 'day', 30);

            expect(result.length).toBe(2);
        });
    });

    describe('getOrdersByStatus', () => {
        it('should return order status breakdown', async () => {
            const mockData = [
                { status: 'Active', count: 10 },
                { status: 'Completed', count: 45 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

            const result = await service.getOrdersByStatus('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('getTopProducts', () => {
        it('should return top selling products', async () => {
            const mockProducts = [
                { product_id: 1, product_name: 'Product A', total_sold: 100, total_revenue: 500000 },
                { product_id: 2, product_name: 'Product B', total_sold: 80, total_revenue: 400000 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getTopProducts('tenant_test', 10);

            expect(result.length).toBe(2);
        });
    });

    describe('getRecentOrders', () => {
        it('should return recent orders', async () => {
            const mockOrders = [
                { id: 1, code: 'ORD-001', total: 50000, state: 'Active' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrders);

            const result = await service.getRecentOrders('tenant_test', 10);

            expect(result.length).toBe(1);
        });
    });

    describe('getCustomerGrowth', () => {
        it('should return customer growth', async () => {
            const mockData = [
                { date: '2026-01-01', count: 5 },
                { date: '2026-01-02', count: 8 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

            const result = await service.getCustomerGrowth('tenant_test', 30);

            expect(result.length).toBe(2);
        });
    });

    describe('getWalletStats', () => {
        it('should return wallet statistics', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ total: 500000, count: 20 }])
                .mockResolvedValueOnce([{ total: 100000, count: 10 }]);

            const result = await service.getWalletStats('tenant_test');

            expect(result).toBeDefined();
        });
    });

    describe('getConversionMetrics', () => {
        it('should return conversion metrics', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ count: 1000 }])
                .mockResolvedValueOnce([{ count: 50 }]);

            const result = await service.getConversionMetrics('tenant_test');

            expect(result).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('getOverviewStats should handle error gracefully', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB fail'));
            const result = await service.getOverviewStats('tenant_test');
            expect(result?.totalRevenue ?? 0).toBe(0);
        });

        it('getRevenueByPeriod should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getRevenueByPeriod('tenant_test', 'day', 30);
            expect(result).toEqual([]);
        });

        it('getOrdersByStatus should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getOrdersByStatus('tenant_test');
            expect(result).toEqual([]);
        });

        it('getTopProducts should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getTopProducts('tenant_test', 10);
            expect(result).toEqual([]);
        });

        it('getRecentOrders should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getRecentOrders('tenant_test', 10);
            expect(result).toEqual([]);
        });

        it('getCustomerGrowth should return empty on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getCustomerGrowth('tenant_test', 30);
            expect(result).toEqual([]);
        });

        it('getWalletStats should handle error gracefully', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getWalletStats('tenant_test');
            expect(result?.totalDeposits ?? 0).toBe(0);
        });

        it('getConversionMetrics should return default on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('fail'));
            const result = await service.getConversionMetrics('tenant_test');
            expect(result.conversionRate).toBe(0);
        });
    });
});
