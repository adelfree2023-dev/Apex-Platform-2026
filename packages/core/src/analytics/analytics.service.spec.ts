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

    describe('getDashboardStats', () => {
        it('should return dashboard statistics', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ total_revenue: 1000000, order_count: 50 }])
                .mockResolvedValueOnce([{ customer_count: 200 }])
                .mockResolvedValueOnce([{ product_count: 100 }]);

            const result = await service.getDashboardStats('tenant_test');

            expect(result).toBeDefined();
        });
    });

    describe('getSalesReport', () => {
        it('should return sales report for date range', async () => {
            const mockSales = [
                { date: '2026-01-01', total: 50000, orders: 5 },
                { date: '2026-01-02', total: 75000, orders: 8 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockSales);

            const result = await service.getSalesReport('tenant_test', '2026-01-01', '2026-01-31');

            expect(result.length).toBe(2);
        });
    });

    describe('getTopProducts', () => {
        it('should return top selling products', async () => {
            const mockProducts = [
                { product_id: 1, name: 'Product A', total_sold: 100, revenue: 500000 },
                { product_id: 2, name: 'Product B', total_sold: 80, revenue: 400000 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getTopProducts('tenant_test', 10);

            expect(result.length).toBe(2);
            expect(result[0].totalSold).toBe(100);
        });
    });

    describe('getCustomerStats', () => {
        it('should return customer statistics', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ new_customers: 20 }])
                .mockResolvedValueOnce([{ returning_customers: 30 }]);

            const result = await service.getCustomerStats('tenant_test', '2026-01-01', '2026-01-31');

            expect(result).toBeDefined();
        });
    });

    describe('getRevenueByCategory', () => {
        it('should return revenue breakdown by category', async () => {
            const mockData = [
                { category: 'Food', revenue: 300000 },
                { category: 'Cosmetics', revenue: 200000 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockData);

            const result = await service.getRevenueByCategory('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('trackEvent', () => {
        it('should track analytics event', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.trackEvent('tenant_test', {
                event: 'page_view',
                customerId: 123,
                data: { page: '/products' },
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
});
