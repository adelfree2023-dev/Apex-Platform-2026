/**
 * Marketplace Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MarketplaceService', () => {
    let service: MarketplaceService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MarketplaceService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<MarketplaceService>(MarketplaceService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createMarketplaceTables', () => {
        it('should create all marketplace tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createMarketplaceTables('tenant_test');

            // Should create 4 tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(4);
        });
    });

    describe('registerVendor', () => {
        it('should register a new vendor', async () => {
            const mockVendor = [{
                id: 1,
                name: 'Tech Store',
                slug: 'tech-store-abc123',
                email: 'tech@vendor.com',
                status: 'pending',
                commission_rate: 15,
                total_sales: 0,
                total_products: 0,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockVendor);

            const result = await service.registerVendor('tenant_test', {
                name: 'Tech Store',
                email: 'tech@vendor.com',
                commissionRate: 15,
            });

            expect(result.name).toBe('Tech Store');
            expect(result.status).toBe('pending');
            expect(result.slug).toContain('tech-store');
        });
    });

    describe('getVendor', () => {
        it('should return vendor by ID', async () => {
            const mockVendor = [{
                id: 1,
                name: 'Fashion Hub',
                slug: 'fashion-hub-xyz',
                email: 'fashion@vendor.com',
                status: 'approved',
                commission_rate: 12,
                total_sales: 50000,
                total_products: 25,
                rating: 4.5,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockVendor);

            const result = await service.getVendor('tenant_test', 1);

            expect(result).not.toBeNull();
            expect(result.name).toBe('Fashion Hub');
            expect(result.totalSales).toBe(50000);
        });

        it('should return null if vendor not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getVendor('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    describe('getVendors', () => {
        it('should return all vendors', async () => {
            const mockVendors = [
                { id: 1, name: 'Vendor A', status: 'approved', commission_rate: 10, total_sales: 10000, total_products: 5, rating: 4.0 },
                { id: 2, name: 'Vendor B', status: 'pending', commission_rate: 15, total_sales: 0, total_products: 0, rating: 0 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockVendors);

            const result = await service.getVendors('tenant_test');

            expect(result).toHaveLength(2);
        });

        it('should filter by status', async () => {
            const mockVendors = [
                { id: 1, name: 'Vendor A', status: 'approved', commission_rate: 10, total_sales: 10000, total_products: 5, rating: 4.0 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockVendors);

            const result = await service.getVendors('tenant_test', 'approved');

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('approved');
        });
    });

    describe('approveVendor', () => {
        it('should approve a pending vendor', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1,
                name: 'New Vendor',
                status: 'approved',
                commission_rate: 15,
                total_sales: 0,
                total_products: 0,
                rating: 0,
            }]);

            const result = await service.approveVendor('tenant_test', 1);

            expect(result.status).toBe('approved');
        });
    });

    describe('addVendorProduct', () => {
        it('should add product to vendor', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addVendorProduct('tenant_test', 1, 100);

            expect(result.success).toBe(true);
        });
    });

    describe('getVendorProducts', () => {
        it('should return vendor products', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', slug: 'product-a', price: 10000, stock_on_hand: 50, status: 'active' },
                { id: 2, name: 'Product B', slug: 'product-b', price: 20000, stock_on_hand: 30, status: 'active' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getVendorProducts('tenant_test', 1);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Product A');
        });
    });

    describe('getVendorDashboard', () => {
        it('should return vendor dashboard stats', async () => {
            const mockVendor = [{
                id: 1, name: 'Test Vendor', status: 'approved',
                commission_rate: 10, total_sales: 100000, total_products: 20, rating: 4.5,
            }];
            const mockPending = [{ total: 5000 }];
            const mockPaid = [{ total: 50000 }];
            const mockRecent = [{ count: 5 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockVendor)
                .mockResolvedValueOnce(mockPending)
                .mockResolvedValueOnce(mockPaid)
                .mockResolvedValueOnce(mockRecent);

            const result = await service.getVendorDashboard('tenant_test', 1);

            expect(result.vendor.name).toBe('Test Vendor');
            expect(result.pendingPayout).toBe(5000);
            expect(result.paidPayout).toBe(50000);
            expect(result.recentOrdersCount).toBe(5);
        });
    });

    describe('requestPayout', () => {
        it('should create payout request', async () => {
            const mockPending = [{ total: 10000 }];
            const mockPayout = [{ id: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockPending)
                .mockResolvedValueOnce(mockPayout);

            const result = await service.requestPayout('tenant_test', 1, 5000, 'bank_transfer');

            expect(result.amount).toBe(5000);
            expect(result.method).toBe('bank_transfer');
            expect(result.status).toBe('processing');
        });

        it('should fail if insufficient balance', async () => {
            const mockPending = [{ total: 1000 }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPending);

            await expect(service.requestPayout('tenant_test', 1, 5000, 'bank_transfer'))
                .rejects.toThrow('Insufficient balance');
        });
    });
});
