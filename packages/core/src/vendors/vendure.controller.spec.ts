/**
 * Vendure Controller Unit Tests
 * Tests Shop API endpoints with tenant resolution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { VendureController } from './vendure.controller';
import { VendureService } from './vendure.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VendureController', () => {
    let controller: VendureController;

    const mockVendureService = {
        getProducts: jest.fn(),
        createProduct: jest.fn(),
        getCart: jest.fn(),
        addToCart: jest.fn(),
        updateCartItem: jest.fn(),
        removeCartItem: jest.fn(),
        checkout: jest.fn(),
        getOrders: jest.fn(),
        getOrderById: jest.fn(),
        getCategories: jest.fn(),
        getProductsByCategory: jest.fn(),
        createCategory: jest.fn(),
        migrateCategories: jest.fn(),
        searchProducts: jest.fn(),
        migrateWallet: jest.fn(),
        getWallet: jest.fn(),
        addFunds: jest.fn(),
        getTransactions: jest.fn(),
        createGiftCard: jest.fn(),
        getGiftCard: jest.fn(),
        redeemGiftCard: jest.fn(),
        getFulfillment: jest.fn(),
        updateFulfillment: jest.fn(),
        requestReturn: jest.fn(),
        getReturn: jest.fn(),
        updateReturnStatus: jest.fn(),
        processRefund: jest.fn(),
    };

    const mockPrismaService = {
        tenant: {
            findUnique: jest.fn(),
        },
    };

    const mockRequest = {
        tenantSchema: 'test_schema',
        query: {},
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VendureController],
            providers: [
                { provide: VendureService, useValue: mockVendureService },
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        controller = module.get<VendureController>(VendureController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== TENANT RESOLUTION ====================

    describe('resolveTenantSchema', () => {
        it('should resolve tenant schema from subdomain', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid-123' });

            // Accessing private method for test (or testing via public method)
            const result = await (controller as any).resolveTenantSchema('test-store');
            expect(result).toBe('tenant_uuid_123');
        });

        it('should throw 404 if tenant not found', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);
            await expect((controller as any).resolveTenantSchema('non-existent'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== PRODUCTS ====================

    describe('getProducts', () => {
        it('should return products', async () => {
            mockVendureService.getProducts.mockResolvedValue([{ id: 1 }]);
            const result = await controller.getProducts('test-store', mockRequest as any);
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });

        it('should throw on service failure', async () => {
            mockVendureService.getProducts.mockRejectedValue(new Error('fail'));
            await expect(controller.getProducts('test-store', mockRequest as any))
                .rejects.toThrow(HttpException);
        });
    });

    describe('createProduct', () => {
        it('should create product', async () => {
            const input = { name: 'P1', slug: 'p1', price: 100 };
            mockVendureService.createProduct.mockResolvedValue({ id: 1, ...input });
            const result = await controller.createProduct('test-store', input, mockRequest as any);
            expect(result.success).toBe(true);
        });

        it('should throw if missing name', async () => {
            await expect(controller.createProduct('test-store', { slug: 'p1', price: 100 } as any, mockRequest as any))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CART ====================

    describe('getCart', () => {
        it('should return cart', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getCart.mockResolvedValue({ id: 1 });
            const result = await controller.getCart('test-store', 'session-1', mockRequest as any);
            expect(result.success).toBe(true);
        });
    });

    describe('addToCart', () => {
        it('should add item', async () => {
            mockVendureService.addToCart.mockResolvedValue({ id: 1 });
            const result = await controller.addToCart('test-store', 'session-1', { productId: 1, quantity: 1 });
            expect(result.success).toBe(true);
        });
    });

    describe('updateCartItem', () => {
        it('should update item', async () => {
            mockVendureService.updateCartItem.mockResolvedValue({ id: 1, quantity: 2 });
            const result = await controller.updateCartItem('test-store', 'item-1', { quantity: 2 });
            expect(result.success).toBe(true);
        });
    });

    describe('removeFromCart', () => {
        it('should remove item', async () => {
            mockVendureService.removeCartItem.mockResolvedValue({ success: true });
            const result = await controller.removeFromCart('test-store', 'item-1');
            expect(result.success).toBe(true);
        });
    });

    // ==================== CHECKOUT & ORDERS ====================

    describe('checkout', () => {
        it('should process checkout', async () => {
            mockVendureService.checkout.mockResolvedValue({ id: 1, code: 'ORD1' });
            const result = await controller.checkout('test-store', 'session-1', { customerEmail: 'test@test.com' });
            expect(result.success).toBe(true);
        });

        it('should throw if missing email', async () => {
            await expect(controller.checkout('test-store', 'sess1', {} as any))
                .rejects.toThrow(HttpException);
        });
    });

    describe('getOrders', () => {
        it('should return orders', async () => {
            mockVendureService.getOrders.mockResolvedValue([]);
            const result = await controller.getOrders('test-store', mockRequest as any);
            expect(result.success).toBe(true);
        });
    });

    describe('getOrderById', () => {
        it('should return order', async () => {
            mockVendureService.getOrderById.mockResolvedValue({ id: 1 });
            const result = await controller.getOrderById('test-store', '1');
            expect(result.success).toBe(true);
        });

        it('should 404 if not found', async () => {
            mockVendureService.getOrderById.mockResolvedValue(null);
            await expect(controller.getOrderById('test-store', '1'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CATEGORIES & SEARCH ====================

    describe('getCategories', () => {
        it('should return categories', async () => {
            mockVendureService.getCategories.mockResolvedValue([]);
            const result = await controller.getCategories('test-store');
            expect(result.success).toBe(true);
        });
    });

    describe('getProductsByCategory', () => {
        it('should return products', async () => {
            mockVendureService.getProductsByCategory.mockResolvedValue([]);
            const result = await controller.getProductsByCategory('test-store', 'slug');
            expect(result.success).toBe(true);
        });
    });

    describe('searchProducts', () => {
        it('should search products', async () => {
            mockVendureService.searchProducts.mockResolvedValue({ items: [] });
            const result = await controller.searchProducts('test-store', mockRequest as any);
            expect(result.success).toBe(true);
        });
    });

    // ==================== WALLET & GIFT CARDS ====================

    describe('getWallet', () => {
        it('should return wallet', async () => {
            mockVendureService.getWallet.mockResolvedValue({ balance: 0 });
            const result = await controller.getWallet('test-store', 'cust-1');
            expect(result.success).toBe(true);
        });
    });

    describe('addFunds', () => {
        it('should add funds', async () => {
            mockVendureService.addFunds.mockResolvedValue({ balance: 100 });
            const result = await controller.addFunds('test-store', 'cust-1', { amount: 100 });
            expect(result.success).toBe(true);
        });
    });

    describe('createGiftCard', () => {
        it('should create gift card', async () => {
            mockVendureService.createGiftCard.mockResolvedValue({ code: 'GC1' });
            const result = await controller.createGiftCard('test-store', { value: 100 });
            expect(result.success).toBe(true);
        });
    });

    // ==================== FULFILLMENT & RETURNS ====================

    describe('getFulfillment', () => {
        it('should return fulfillment', async () => {
            mockVendureService.getFulfillment.mockResolvedValue({ id: 1 });
            const result = await controller.getFulfillment('test-store', '1');
            expect(result.success).toBe(true);
        });
    });

    describe('requestReturn', () => {
        it('should request return', async () => {
            mockVendureService.requestReturn.mockResolvedValue({ id: 1 });
            const result = await controller.requestReturn('test-store', { orderId: 1, reason: 'R1' });
            expect(result.success).toBe(true);
        });
    });

    // ==================== HEALTH ====================

    describe('healthCheck', () => {
        it('should return health', async () => {
            const result = await controller.healthCheck('test-store');
            expect(result.status).toBe('ok');
        });
    });

    // ==================== MIGRATIONS ====================

    describe('Migrations', () => {
        it('migrateCategories should work', async () => {
            mockVendureService.migrateCategories.mockResolvedValue({ success: true });
            const result = await controller.migrateCategories('test-store');
            expect(result.success).toBe(true);
        });

        it('migrateWallet should work', async () => {
            mockVendureService.migrateWallet.mockResolvedValue({ success: true });
            const result = await controller.migrateWallet('test-store');
            expect(result.success).toBe(true);
        });
    });
});
