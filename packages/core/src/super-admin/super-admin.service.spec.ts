/**
 * Admin Service Unit Tests
 * Root-analyzed: Uses PrismaService with tenant.findMany, tenant.findUnique, tenant.update, $queryRawUnsafe
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SuperAdminService', () => {
    let service: SuperAdminService;

    const mockPrismaService = {
        tenant: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SuperAdminService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SuperAdminService>(SuperAdminService);
        jest.clearAllMocks();
        // Silence logger for tests
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== GET TENANTS ====================

    describe('getTenants', () => {
        it('should return all tenants ordered by createdAt desc', async () => {
            const mockTenants = [
                { id: 'tenant-1', name: 'Store 1', createdAt: new Date() },
                { id: 'tenant-2', name: 'Store 2', createdAt: new Date() },
            ];
            mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);

            const result = await service.getTenants();

            expect(result).toEqual(mockTenants);
            expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should return empty array when no tenants', async () => {
            mockPrismaService.tenant.findMany.mockResolvedValue([]);

            const result = await service.getTenants();

            expect(result).toEqual([]);
        });
    });

    // ==================== GET TENANT ====================

    describe('getTenant', () => {
        it('should return tenant by id', async () => {
            const mockTenant = { id: 'tenant-1', name: 'Store 1' };
            mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

            const result = await service.getTenant('tenant-1');

            expect(result).toEqual(mockTenant);
            expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
            });
        });

        it('should throw NotFoundException for non-existent tenant', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            await expect(service.getTenant('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== GET TENANT STATS ====================

    describe('getTenantStats', () => {
        it('should return tenant statistics', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ count: '50' }]) // products
                .mockResolvedValueOnce([{ order_count: '100', total_revenue: '150000' }]) // orders
                .mockResolvedValueOnce([{ count: '200' }]); // customers

            const result = await service.getTenantStats('test-store');

            expect(result).toEqual({
                products: 50,
                orders: 100,
                revenue: 150000,
                customers: 200,
            });
        });

        it('should handle empty stats', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ count: '0' }])
                .mockResolvedValueOnce([{ order_count: '0', total_revenue: '0' }])
                .mockResolvedValueOnce([{ count: '0' }]);

            const result = await service.getTenantStats('test-store');

            expect(result.products).toBe(0);
            expect(result.orders).toBe(0);
        });

        it('should handle null values gracefully', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{}]);

            const result = await service.getTenantStats('test-store');

            expect(result.products).toBe(0);
            expect(result.orders).toBe(0);
            expect(result.revenue).toBe(0);
            expect(result.customers).toBe(0);
        });

        it('should throw NotFoundException if tenant does not exist', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            await expect(service.getTenantStats('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return zeros on database query error (but after validation)', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Query failed'));

            const result = await service.getTenantStats('test-store');

            expect(result).toEqual({
                products: 0,
                orders: 0,
                revenue: 0,
                customers: 0,
            });
        });

        it('should format tenantId correctly (replace dashes with underscores)', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-my-store' });
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: '0' }]);

            await service.getTenantStats('test-my-store');

            // Find call that contains the schema name
            const schemaQueryCall = mockPrismaService.$queryRawUnsafe.mock.calls.find(call =>
                call[0].includes('tenant_test_my_store')
            );
            expect(schemaQueryCall).toBeDefined();
        });
    });

    // ==================== GET RECENT ORDERS ====================

    describe('getRecentOrders', () => {
        it('should return recent orders with customer email', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            const mockOrders = [
                { id: 1001, total: 500, customer_email: 'ahmed@example.com' },
                { id: 1002, total: 750, customer_email: 'mohamed@example.com' },
            ];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrders);

            const result = await service.getRecentOrders('test-store', 10);

            expect(result).toEqual(mockOrders);
            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT $1'),
                10
            );
        });

        it('should use default limit of 10', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getRecentOrders('test-store');

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                10
            );
        });

        it('should throw NotFoundException if tenant missing', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            await expect(service.getRecentOrders('test-store'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== GET TOP PRODUCTS ====================

    describe('getTopProducts', () => {
        it('should return top products by order count', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            const mockProducts = [
                { id: 1, name: 'iPhone', price: 5000, order_count: 100 },
                { id: 2, name: 'MacBook', price: 8000, order_count: 50 },
            ];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getTopProducts('test-store', 5);

            expect(result).toEqual(mockProducts);
            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY order_count DESC'),
                5
            );
        });

        it('should use default limit of 10', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'test-store' });
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getTopProducts('test-store');

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                10
            );
        });

        it('should throw NotFoundException if tenant missing', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            await expect(service.getTopProducts('test-store'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== UPDATE TENANT ====================

    describe('updateTenant', () => {
        it('should update tenant name', async () => {
            const updatedTenant = { id: 'tenant-1', name: 'New Store Name' };
            mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

            const result = await service.updateTenant('tenant-1', { name: 'New Store Name' });

            expect(result).toEqual(updatedTenant);
            expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
                data: expect.objectContaining({
                    name: 'New Store Name',
                    updatedAt: expect.any(Date),
                }),
            });
        });

        it('should update tenant territory', async () => {
            mockPrismaService.tenant.update.mockResolvedValue({ id: 'tenant-1', territory: 'Egypt' });

            await service.updateTenant('tenant-1', { territory: 'Egypt' });

            expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
                data: expect.objectContaining({
                    territory: 'Egypt',
                }),
            });
        });

        it('should update tenant businessType', async () => {
            mockPrismaService.tenant.update.mockResolvedValue({ id: 'tenant-1', businessType: 'electronics' });

            await service.updateTenant('tenant-1', { businessType: 'electronics' });

            expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
                data: expect.objectContaining({
                    businessType: 'electronics',
                }),
            });
        });

        it('should update multiple fields', async () => {
            mockPrismaService.tenant.update.mockResolvedValue({});

            await service.updateTenant('tenant-1', {
                name: 'New Name',
                territory: 'UAE',
                businessType: 'fashion',
            });

            expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
                data: expect.objectContaining({
                    name: 'New Name',
                    territory: 'UAE',
                    businessType: 'fashion',
                }),
            });
        });
    });

    // ==================== GET PLATFORM STATS ====================

    describe('getPlatformStats', () => {
        it('should aggregate stats across all tenants', async () => {
            mockPrismaService.tenant.count.mockResolvedValue(2);
            mockPrismaService.tenant.findMany.mockResolvedValue([
                { id: 'tenant-1' },
                { id: 'tenant-2' },
            ]);

            // Mock validation and stats for each tenant
            // We need 2 findUnique calls per tenant (one for validation, one for the internal getTenantStats call)
            mockPrismaService.tenant.findUnique
                .mockResolvedValueOnce({ id: 'tenant-1' }) // validate
                .mockResolvedValueOnce({ id: 'tenant-1' }) // getTenantStats internal validate
                .mockResolvedValueOnce({ id: 'tenant-2' }) // validate
                .mockResolvedValueOnce({ id: 'tenant-2' }); // getTenantStats internal validate

            // Mock stats for each tenant
            mockPrismaService.$queryRawUnsafe
                // Tenant 1 stats
                .mockResolvedValueOnce([{ count: '10' }])
                .mockResolvedValueOnce([{ order_count: '5', total_revenue: '5000' }])
                .mockResolvedValueOnce([{ count: '20' }])
                // Tenant 2 stats
                .mockResolvedValueOnce([{ count: '15' }])
                .mockResolvedValueOnce([{ order_count: '10', total_revenue: '10000' }])
                .mockResolvedValueOnce([{ count: '30' }]);

            const result = await service.getPlatformStats();

            expect(result).toEqual({
                tenants: 2,
                products: 25, // 10 + 15
                orders: 15, // 5 + 10
                revenue: 15000, // 5000 + 10000
                customers: 50, // 20 + 30
            });
        });

        it('should return zeros for empty platform', async () => {
            mockPrismaService.tenant.count.mockResolvedValue(0);
            mockPrismaService.tenant.findMany.mockResolvedValue([]);

            const result = await service.getPlatformStats();

            expect(result).toEqual({
                tenants: 0,
                products: 0,
                orders: 0,
                revenue: 0,
                customers: 0,
            });
        });
    });
});
