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
        getOrCreateWallet: jest.fn(),
        addFunds: jest.fn(),
        getTransactions: jest.fn(),
        createGiftCard: jest.fn(),
        getGiftCard: jest.fn(),
        redeemGiftCard: jest.fn(),
        migrateFulfillment: jest.fn(),
        getFulfillment: jest.fn(),
        updateOrderStatus: jest.fn(),
        shipOrder: jest.fn(),
        deliverOrder: jest.fn(),
        createReturn: jest.fn(),
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
        it('should update cart item', async () => {
            mockVendureService.updateCartItem.mockResolvedValue({ id: 1, quantity: 5 });
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            const result = await controller.updateCartItem('test-store', '1', { quantity: 5 });
            expect(result.success).toBe(true);
        });
    });

    describe('removeFromCart', () => {
        it('should remove from cart', async () => {
            mockVendureService.removeCartItem.mockResolvedValue({ success: true });
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            const result = await controller.removeFromCart('test-store', '1');
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

        it('should throw without email', async () => {
            await expect(controller.checkout('test-store', 'session-1', {} as any))
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

        it('should throw 404 if not found', async () => {
            mockVendureService.getOrderById.mockResolvedValue(null);
            await expect(controller.getOrderById('test-store', '999'))
                .rejects.toThrow(HttpException);
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status', async () => {
            mockVendureService.updateOrderStatus.mockResolvedValue({ id: 1, status: 'Shipped' });
            const result = await controller.updateOrderStatus('test-store', '1', { status: 'Shipped' });
            expect(result.success).toBe(true);
        });
    });

    describe('shipOrder', () => {
        it('should ship order', async () => {
            mockVendureService.shipOrder.mockResolvedValue({ id: 1 });
            const result = await controller.shipOrder('test-store', '1', { trackingCode: 'TRK123' });
            expect(result.success).toBe(true);
        });
    });

    describe('deliverOrder', () => {
        it('should deliver order', async () => {
            mockVendureService.deliverOrder.mockResolvedValue({ id: 1 });
            const result = await controller.deliverOrder('test-store', '1');
            expect(result.success).toBe(true);
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
        it('should return products by category', async () => {
            mockVendureService.getProductsByCategory.mockResolvedValue([]);
            const result = await controller.getProductsByCategory('test-store', 'cat-slug');
            expect(result.success).toBe(true);
        });
    });

    describe('createCategory', () => {
        it('should create category', async () => {
            mockVendureService.createCategory.mockResolvedValue({ id: 1, name: 'Cat1' });
            const result = await controller.createCategory('test-store', { name: 'Cat1', slug: 'cat1' });
            expect(result.success).toBe(true);
        });

        it('should throw without name', async () => {
            await expect(controller.createCategory('test-store', { name: '', slug: '' }))
                .rejects.toThrow(HttpException);
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
            mockVendureService.getOrCreateWallet.mockResolvedValue({ balance: 0 });
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

        it('should throw without amount', async () => {
            await expect(controller.addFunds('test-store', 'cust-1', { amount: 0 }))
                .rejects.toThrow(HttpException);
        });
    });

    describe('getTransactions', () => {
        it('should return transactions', async () => {
            mockVendureService.getTransactions.mockResolvedValue([]);
            const result = await controller.getTransactions('test-store', 'cust-1');
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

    describe('getGiftCard', () => {
        it('should get gift card', async () => {
            mockVendureService.getGiftCard.mockResolvedValue({ code: 'GC1', balance: 100 });
            const result = await controller.getGiftCard('test-store', 'GC1');
            expect(result.success).toBe(true);
        });
    });

    describe('redeemGiftCard', () => {
        it('should redeem gift card', async () => {
            mockVendureService.redeemGiftCard.mockResolvedValue({ success: true });
            const result = await controller.redeemGiftCard('test-store', 'GC1', { customerId: 1 });
            expect(result.success).toBe(true);
        });
    });

    // ==================== FULFILLMENT & RETURNS ====================

    describe('getOrderFulfillment', () => {
        it('should return fulfillment', async () => {
            mockVendureService.getFulfillment.mockResolvedValue({ id: 1 });
            const result = await controller.getOrderFulfillment('test-store', '1');
            expect(result.success).toBe(true);
        });
    });

    describe('createReturn', () => {
        it('should request return', async () => {
            mockVendureService.createReturn.mockResolvedValue({ id: 1 });
            const result = await controller.createReturn('test-store', '1', { reason: 'R1' });
            expect(result.success).toBe(true);
        });
    });

    describe('processRefund', () => {
        it('should process refund', async () => {
            mockVendureService.processRefund.mockResolvedValue({ success: true });
            const result = await controller.processRefund('test-store', '1', { refundAmount: 100 });
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
});
