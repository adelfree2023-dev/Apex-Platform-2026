/**
 * Admin Controller Unit Tests
 * Covers: Platform stats, Tenant management, Analytics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';

describe('SuperAdminController', () => {
    let controller: SuperAdminController;

    const mockSuperAdminService = {
        getPlatformStats: jest.fn(),
        getTenants: jest.fn(),
        getTenant: jest.fn(),
        getTenantStats: jest.fn(),
        getRecentOrders: jest.fn(),
        getTopProducts: jest.fn(),
        updateTenant: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SuperAdminController],
            providers: [
                { provide: SuperAdminService, useValue: mockSuperAdminService },
            ],
        }).compile();

        controller = module.get<SuperAdminController>(SuperAdminController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== PLATFORM STATS ====================

    describe('getPlatformStats', () => {
        it('should return platform statistics', async () => {
            const stats = {
                totalTenants: 10,
                activeTenants: 8,
                totalOrders: 500,
                totalRevenue: 1500000,
            };
            mockSuperAdminService.getPlatformStats.mockResolvedValue(stats);

            const result = await controller.getPlatformStats();

            expect(result.success).toBe(true);
            expect(result.data.totalTenants).toBe(10);
        });

        it('should handle errors', async () => {
            mockSuperAdminService.getPlatformStats.mockRejectedValue(new Error('Database error'));

            await expect(controller.getPlatformStats())
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== TENANTS ====================

    describe('getTenants', () => {
        it('should return all tenants', async () => {
            const tenants = [
                { id: '1', name: 'Store 1' },
                { id: '2', name: 'Store 2' },
            ];
            mockSuperAdminService.getTenants.mockResolvedValue(tenants);

            const result = await controller.getTenants();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should handle errors', async () => {
            mockSuperAdminService.getTenants.mockRejectedValue(new Error('Database error'));

            await expect(controller.getTenants())
                .rejects.toThrow(HttpException);
        });
    });

    describe('getTenant', () => {
        it('should return tenant by ID', async () => {
            const tenant = { id: 'uuid-123', name: 'Test Store' };
            mockSuperAdminService.getTenant.mockResolvedValue(tenant);

            const result = await controller.getTenant('uuid-123');

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Test Store');
        });

        it('should throw 404 for non-existent tenant', async () => {
            mockSuperAdminService.getTenant.mockResolvedValue(null);

            await expect(controller.getTenant('non-existent'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== TENANT STATS ====================

    describe('getTenantStats', () => {
        it('should return tenant statistics', async () => {
            const stats = {
                totalProducts: 50,
                totalOrders: 100,
                revenue: 250000,
            };
            mockSuperAdminService.getTenantStats.mockResolvedValue(stats);

            const result = await controller.getTenantStats('uuid-123');

            expect(result.success).toBe(true);
            expect(result.data.totalProducts).toBe(50);
        });

        it('should handle errors', async () => {
            mockSuperAdminService.getTenantStats.mockRejectedValue(new Error('Error'));

            await expect(controller.getTenantStats('uuid-123'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== ORDERS ====================

    describe('getRecentOrders', () => {
        it('should return recent orders for tenant', async () => {
            const orders = [
                { id: 1, code: 'ORD-001', total: 15000 },
                { id: 2, code: 'ORD-002', total: 25000 },
            ];
            mockSuperAdminService.getRecentOrders.mockResolvedValue(orders);

            const result = await controller.getRecentOrders('uuid-123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty array for tenant with no orders', async () => {
            mockSuperAdminService.getRecentOrders.mockResolvedValue([]);

            const result = await controller.getRecentOrders('uuid-123');

            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
        });
    });

    // ==================== TOP PRODUCTS ====================

    describe('getTopProducts', () => {
        it('should return top products for tenant', async () => {
            const products = [
                { id: 1, name: 'Product A', sales: 100 },
                { id: 2, name: 'Product B', sales: 80 },
            ];
            mockSuperAdminService.getTopProducts.mockResolvedValue(products);

            const result = await controller.getTopProducts('uuid-123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });
    });

    // ==================== UPDATE TENANT ====================

    describe('updateTenant', () => {
        it('should update tenant successfully', async () => {
            const updatedTenant = { id: 'uuid-123', name: 'New Name' };
            mockSuperAdminService.updateTenant.mockResolvedValue(updatedTenant);

            const result = await controller.updateTenant('uuid-123', { name: 'New Name' });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('New Name');
            expect(result.message).toContain('updated');
        });

        it('should update multiple fields', async () => {
            const updatedTenant = {
                id: 'uuid-123',
                name: 'New Name',
                territory: 'Alexandria',
                businessType: 'WHOLESALE',
            };
            mockSuperAdminService.updateTenant.mockResolvedValue(updatedTenant);

            const result = await controller.updateTenant('uuid-123', {
                name: 'New Name',
                territory: 'Alexandria',
                businessType: 'WHOLESALE',
            });

            expect(result.data.territory).toBe('Alexandria');
        });

        it('should handle errors', async () => {
            mockSuperAdminService.updateTenant.mockRejectedValue(new Error('Error'));

            await expect(controller.updateTenant('uuid-123', { name: 'New' }))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== EDGE CASES ====================

    describe('Edge Cases', () => {
        it('should handle empty stats', async () => {
            mockSuperAdminService.getPlatformStats.mockResolvedValue({
                totalTenants: 0,
                activeTenants: 0,
                totalOrders: 0,
                totalRevenue: 0,
            });

            const result = await controller.getPlatformStats();

            expect(result.success).toBe(true);
            expect(result.data.totalTenants).toBe(0);
        });
    });
});
