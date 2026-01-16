/**
 * Marketplace Controller Unit Tests
 * Covers: Vendors, Products, Orders, Payouts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceController', () => {
    let controller: MarketplaceController;

    const mockMarketplaceService = {
        createMarketplaceTables: jest.fn(),
        registerVendor: jest.fn(),
        getVendors: jest.fn(),
        getVendor: jest.fn(),
        getVendorBySlug: jest.fn(),
        approveVendor: jest.fn(),
        addVendorProduct: jest.fn(),
        getVendorProducts: jest.fn(),
        getVendorOrders: jest.fn(),
        getVendorDashboard: jest.fn(),
        requestPayout: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MarketplaceController],
            providers: [
                { provide: MarketplaceService, useValue: mockMarketplaceService },
            ],
        }).compile();

        controller = module.get<MarketplaceController>(MarketplaceController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateMarketplace', () => {
        it('should create marketplace tables', async () => {
            mockMarketplaceService.createMarketplaceTables.mockResolvedValue(undefined);

            const result = await controller.migrateMarketplace('test-store');

            expect(result.success).toBe(true);
        });

        it('should handle migration errors', async () => {
            mockMarketplaceService.createMarketplaceTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateMarketplace('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== VENDOR REGISTRATION ====================

    describe('registerVendor', () => {
        it('should register vendor', async () => {
            mockMarketplaceService.registerVendor.mockResolvedValue({
                id: 1,
                name: 'Cairo Electronics',
                slug: 'cairo-electronics',
                status: 'pending',
            });

            const result = await controller.registerVendor('test-store', {
                name: 'Cairo Electronics',
                email: 'vendor@example.com',
                phone: '+201234567890',
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Cairo Electronics');
        });

        it('should throw without name', async () => {
            await expect(controller.registerVendor('test-store', {
                name: '',
                email: 'vendor@example.com',
            } as any)).rejects.toThrow(HttpException);
        });

        it('should throw without email', async () => {
            await expect(controller.registerVendor('test-store', {
                name: 'Test Vendor',
                email: '',
            } as any)).rejects.toThrow(HttpException);
        });
    });

    // ==================== GET VENDORS ====================

    describe('getVendors', () => {
        it('should return all vendors', async () => {
            mockMarketplaceService.getVendors.mockResolvedValue([
                { id: 1, name: 'Vendor 1', status: 'approved' },
                { id: 2, name: 'Vendor 2', status: 'pending' },
            ]);

            const result = await controller.getVendors('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should filter by status', async () => {
            mockMarketplaceService.getVendors.mockResolvedValue([
                { id: 1, name: 'Vendor 1', status: 'approved' },
            ]);

            await controller.getVendors('test-store', 'approved');

            expect(mockMarketplaceService.getVendors).toHaveBeenCalledWith(
                'tenant_test_store',
                'approved'
            );
        });

        it('should return empty on error', async () => {
            mockMarketplaceService.getVendors.mockRejectedValue(new Error());

            const result = await controller.getVendors('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('getVendor', () => {
        it('should return vendor by ID', async () => {
            mockMarketplaceService.getVendor.mockResolvedValue({
                id: 1,
                name: 'Cairo Electronics',
                status: 'approved',
            });

            const result = await controller.getVendor('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
        });

        it('should return found: false for non-existent', async () => {
            mockMarketplaceService.getVendor.mockResolvedValue(null);

            const result = await controller.getVendor('test-store', '999');

            expect(result.found).toBe(false);
        });
    });

    describe('getVendorBySlug', () => {
        it('should return vendor by slug', async () => {
            mockMarketplaceService.getVendorBySlug.mockResolvedValue({
                id: 1,
                name: 'Cairo Electronics',
                slug: 'cairo-electronics',
            });

            const result = await controller.getVendorBySlug('test-store', 'cairo-electronics');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
        });
    });

    // ==================== VENDOR APPROVAL ====================

    describe('approveVendor', () => {
        it('should approve vendor', async () => {
            mockMarketplaceService.approveVendor.mockResolvedValue({
                id: 1,
                status: 'approved',
            });

            const result = await controller.approveVendor('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.message).toContain('approved');
        });

        it('should handle approval errors', async () => {
            mockMarketplaceService.approveVendor.mockRejectedValue(new Error('Error'));

            await expect(controller.approveVendor('test-store', '1'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== VENDOR PRODUCTS ====================

    describe('addVendorProduct', () => {
        it('should add product to vendor', async () => {
            mockMarketplaceService.addVendorProduct.mockResolvedValue({
                vendorId: 1,
                productId: 100,
            });

            const result = await controller.addVendorProduct('test-store', '1', {
                productId: 100,
            });

            expect(result.success).toBe(true);
        });

        it('should throw without productId', async () => {
            await expect(controller.addVendorProduct('test-store', '1', {
                productId: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getVendorProducts', () => {
        it('should return vendor products', async () => {
            mockMarketplaceService.getVendorProducts.mockResolvedValue([
                { id: 1, name: 'Product 1' },
                { id: 2, name: 'Product 2' },
            ]);

            const result = await controller.getVendorProducts('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockMarketplaceService.getVendorProducts.mockRejectedValue(new Error());

            const result = await controller.getVendorProducts('test-store', '1');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== VENDOR ORDERS ====================

    describe('getVendorOrders', () => {
        it('should return vendor orders', async () => {
            mockMarketplaceService.getVendorOrders.mockResolvedValue([
                { id: 1001, total: 500, status: 'pending' },
                { id: 1002, total: 750, status: 'shipped' },
            ]);

            const result = await controller.getVendorOrders('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockMarketplaceService.getVendorOrders.mockRejectedValue(new Error());

            const result = await controller.getVendorOrders('test-store', '1');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== VENDOR DASHBOARD ====================

    describe('getVendorDashboard', () => {
        it('should return vendor dashboard', async () => {
            mockMarketplaceService.getVendorDashboard.mockResolvedValue({
                totalSales: 50000,
                totalOrders: 100,
                pendingPayouts: 5000,
            });

            const result = await controller.getVendorDashboard('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data.totalSales).toBe(50000);
        });

        it('should handle errors', async () => {
            mockMarketplaceService.getVendorDashboard.mockRejectedValue(new Error('Error'));

            const result = await controller.getVendorDashboard('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
        });
    });

    // ==================== PAYOUTS ====================

    describe('requestPayout', () => {
        it('should request payout', async () => {
            mockMarketplaceService.requestPayout.mockResolvedValue({
                payoutId: 1,
                amount: 5000,
                status: 'pending',
            });

            const result = await controller.requestPayout('test-store', '1', {
                amount: 5000,
                method: 'bank_transfer',
            });

            expect(result.success).toBe(true);
        });

        it('should throw without amount', async () => {
            await expect(controller.requestPayout('test-store', '1', {
                amount: undefined as any,
                method: 'bank_transfer',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without method', async () => {
            await expect(controller.requestPayout('test-store', '1', {
                amount: 5000,
                method: '',
            })).rejects.toThrow(HttpException);
        });

        it('should handle payout errors', async () => {
            mockMarketplaceService.requestPayout.mockRejectedValue(new Error('Insufficient balance'));

            await expect(controller.requestPayout('test-store', '1', {
                amount: 10000,
                method: 'bank_transfer',
            })).rejects.toThrow(HttpException);
        });
    });
});
