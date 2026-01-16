/**
 * Bundle Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BundleService } from './bundle.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BundleService', () => {
    let service: BundleService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BundleService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<BundleService>(BundleService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createBundleTables', () => {
        it('should create bundle tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createBundleTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('createBundle', () => {
        it('should create a bundle', async () => {
            const mockBundle = [{ id: 1, name: 'Starter Pack', slug: 'starter-pack', bundle_price: 50000 }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockBundle);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.createBundle('tenant_test', {
                name: 'Starter Pack',
                slug: 'starter-pack',
                bundlePrice: 50000,
                items: [{ productVariantId: 1, quantity: 2 }],
            });

            expect(result.name).toBe('Starter Pack');
        });
    });

    describe('getBundle', () => {
        it('should return bundle by ID', async () => {
            const mockBundle = [{
                id: 1, name: 'Bundle A', slug: 'bundle-a', description: 'Test',
                bundle_price: 30000, is_active: true, created_at: new Date(),
            }];
            const mockItems = [{ id: 1, product_variant_id: 10, quantity: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockBundle)
                .mockResolvedValueOnce(mockItems);

            const result = await service.getBundle('tenant_test', 1);

            expect(result).not.toBeNull();
            expect(result.name).toBe('Bundle A');
        });

        it('should return null if bundle not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getBundle('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    describe('getBundles', () => {
        it('should return all active bundles', async () => {
            const mockBundles = [
                { id: 1, name: 'Bundle A', slug: 'bundle-a', bundle_price: 30000, is_active: true, item_count: 3 },
                { id: 2, name: 'Bundle B', slug: 'bundle-b', bundle_price: 50000, is_active: true, item_count: 5 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockBundles);

            const result = await service.getBundles('tenant_test');

            expect(result).toHaveLength(2);
        });
    });

    describe('deleteBundle', () => {
        it('should delete bundle', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.deleteBundle('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
    // ==================== GET BUNDLE BY SLUG ====================

    describe('getBundleBySlug', () => {
        it('should return bundle by slug', async () => {
            const mockBundle = [{
                id: 1, name: 'Bundle Slug', slug: 'slug-1', is_active: true
            }];
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockBundle) // getBundleBySlug
                .mockResolvedValueOnce([]); // getBundleItems

            const result = await service.getBundleBySlug('tenant_test', 'slug-1');
            expect(result.slug).toBe('slug-1');
        });

        it('should return null if slug not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);
            const result = await service.getBundleBySlug('tenant_test', 'unknown');
            expect(result).toBeNull();
        });
    });

    // ==================== UPDATE BUNDLE ====================

    describe('updateBundle', () => {
        it('should update bundle fields', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            // Mock getBundle response for the return value
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, name: 'Updated Name', bundle_price: 6000 }]) // getBundle
                .mockResolvedValueOnce([]); // getItems

            const result = await service.updateBundle('tenant_test', 1, {
                name: 'Updated Name', bundlePrice: 6000
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE'),
                'Updated Name',
                6000,
                1
            );
            expect(result.name).toBe('Updated Name');
        });
    });

    // ==================== ADD BUNDLE TO CART ====================

    describe('addBundleToCart', () => {
        it('should add bundle items to cart', async () => {
            // Mock getBundle with items
            const mockBundle = [{ id: 1, name: 'Cart Bundle' }];
            const mockItems = [
                { id: 1, variantId: 101, quantity: 2, stockOnHand: 10, productName: 'Item 1' },
                { id: 2, variantId: 102, quantity: 1, stockOnHand: 5, productName: 'Item 2' }
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockBundle) // getBundle
                .mockResolvedValueOnce(mockItems); // getBundleItems

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addBundleToCart('tenant_test', 'session-123', 1);

            expect(result.success).toBe(true);
            // Verify items are added to cart
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2);
        });

        it('should fail if bundle not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]); // getBundle returns empty

            await expect(service.addBundleToCart('tenant_test', 's-1', 99))
                .rejects.toThrow('Bundle not found');
        });

        it('should fail if insufficient stock', async () => {
            const mockBundle = [{ id: 1, name: 'Stock Bundle' }];
            const mockItems = [
                { id: 1, variantId: 101, quantity: 5, stockOnHand: 2, productName: 'Low Stock Item' } // Request 5, have 2
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockBundle)
                .mockResolvedValueOnce(mockItems);

            await expect(service.addBundleToCart('tenant_test', 's-1', 1))
                .rejects.toThrow('Insufficient stock for Low Stock Item');
        });
    });
});
