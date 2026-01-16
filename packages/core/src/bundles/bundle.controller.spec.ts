/**
 * Bundle Controller Unit Tests
 * Covers: Bundle CRUD, Add to Cart
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { BundleController } from './bundle.controller';
import { BundleService } from './bundle.service';

describe('BundleController', () => {
    let controller: BundleController;

    const mockBundleService = {
        createBundleTables: jest.fn(),
        getBundles: jest.fn(),
        getBundle: jest.fn(),
        getBundleBySlug: jest.fn(),
        createBundle: jest.fn(),
        updateBundle: jest.fn(),
        deleteBundle: jest.fn(),
        addBundleToCart: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BundleController],
            providers: [
                { provide: BundleService, useValue: mockBundleService },
            ],
        }).compile();

        controller = module.get<BundleController>(BundleController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateBundles', () => {
        it('should create bundle tables', async () => {
            mockBundleService.createBundleTables.mockResolvedValue(undefined);

            const result = await controller.migrateBundles('test-store');

            expect(result.success).toBe(true);
        });

        it('should handle errors', async () => {
            mockBundleService.createBundleTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateBundles('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== GET BUNDLES ====================

    describe('getBundles', () => {
        it('should return all bundles', async () => {
            mockBundleService.getBundles.mockResolvedValue([
                { id: 1, name: 'Tech Bundle', bundlePrice: 5000 },
                { id: 2, name: 'Office Bundle', bundlePrice: 3000 },
            ]);

            const result = await controller.getBundles('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockBundleService.getBundles.mockRejectedValue(new Error());

            const result = await controller.getBundles('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('getBundle', () => {
        it('should get bundle by ID', async () => {
            mockBundleService.getBundle.mockResolvedValue({
                id: 1,
                name: 'Tech Bundle',
                items: [{ productId: 10, quantity: 1 }],
            });

            const result = await controller.getBundle('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
            expect(mockBundleService.getBundle).toHaveBeenCalled();
        });

        it('should get bundle by slug', async () => {
            mockBundleService.getBundleBySlug.mockResolvedValue({
                id: 1,
                name: 'Tech Bundle',
                slug: 'tech-bundle',
            });

            const result = await controller.getBundle('test-store', 'tech-bundle');

            expect(result.success).toBe(true);
            expect(mockBundleService.getBundleBySlug).toHaveBeenCalled();
        });

        it('should return found: false for non-existent', async () => {
            mockBundleService.getBundle.mockResolvedValue(null);

            const result = await controller.getBundle('test-store', '999');

            expect(result.found).toBe(false);
        });
    });

    // ==================== CREATE/UPDATE/DELETE ====================

    describe('createBundle', () => {
        it('should create bundle', async () => {
            mockBundleService.createBundle.mockResolvedValue({
                id: 3,
                name: 'Gaming Bundle',
                slug: 'gaming-bundle',
                bundlePrice: 8000,
            });

            const result = await controller.createBundle('test-store', {
                name: 'Gaming Bundle',
                slug: 'gaming-bundle',
                bundlePrice: 8000,
                items: [{ productId: 10, quantity: 1 }],
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Gaming Bundle');
        });

        it('should throw without name', async () => {
            await expect(controller.createBundle('test-store', {
                name: '',
                slug: 'test',
                bundlePrice: 1000,
                items: [{ productId: 1, quantity: 1 }],
            })).rejects.toThrow(HttpException);
        });

        it('should throw without slug', async () => {
            await expect(controller.createBundle('test-store', {
                name: 'Test',
                slug: '',
                bundlePrice: 1000,
                items: [{ productId: 1, quantity: 1 }],
            })).rejects.toThrow(HttpException);
        });

        it('should throw without items', async () => {
            await expect(controller.createBundle('test-store', {
                name: 'Test',
                slug: 'test',
                bundlePrice: 1000,
                items: [],
            })).rejects.toThrow(HttpException);
        });
    });

    describe('updateBundle', () => {
        it('should update bundle', async () => {
            mockBundleService.updateBundle.mockResolvedValue({
                id: 1,
                name: 'Updated Bundle',
                bundlePrice: 6000,
            });

            const result = await controller.updateBundle('test-store', '1', {
                name: 'Updated Bundle',
                bundlePrice: 6000,
            });

            expect(result.success).toBe(true);
            expect(result.data.bundlePrice).toBe(6000);
        });
    });

    describe('deleteBundle', () => {
        it('should delete bundle', async () => {
            mockBundleService.deleteBundle.mockResolvedValue(undefined);

            const result = await controller.deleteBundle('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.message).toContain('deleted');
        });
    });

    // ==================== ADD TO CART ====================

    describe('addBundleToCart', () => {
        it('should add bundle to cart', async () => {
            mockBundleService.addBundleToCart.mockResolvedValue({
                cartItems: 3,
                bundleTotal: 5000,
            });

            const result = await controller.addBundleToCart('test-store', '1', {
                sessionId: 'session-123',
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('added to cart');
        });

        it('should throw without sessionId', async () => {
            await expect(controller.addBundleToCart('test-store', '1', {
                sessionId: '',
            })).rejects.toThrow(HttpException);
        });

        it('should handle errors', async () => {
            mockBundleService.addBundleToCart.mockRejectedValue(new Error('Bundle not found'));

            await expect(controller.addBundleToCart('test-store', '999', {
                sessionId: 'session-123',
            })).rejects.toThrow(HttpException);
        });
    });
});
