/**
 * Vendure Controller Unit Tests
 * Tests Shop API endpoints with tenant resolution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { VendureController } from './vendure.controller';
import { VendureService } from './vendure.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VendureController', () => {
    let controller: VendureController;

    const mockVendureService = {
        getProducts: jest.fn(),
        createProduct: jest.fn(),
        getOrCreateCart: jest.fn(),
        getCart: jest.fn(),
        addToCart: jest.fn(),
        updateCartItem: jest.fn(),
        removeCartItem: jest.fn(),
        checkout: jest.fn(),
        getOrders: jest.fn(),
        getOrderById: jest.fn(),
        updateOrderStatus: jest.fn(),
        getCategories: jest.fn(),
        searchProducts: jest.fn(),
    };

    const mockPrismaService = {
        tenant: {
            findUnique: jest.fn(),
        },
    };

    const mockRequest = {
        tenantSchema: undefined,
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

    describe('Tenant Resolution', () => {
        it('should resolve tenant schema from subdomain', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({
                id: 'uuid-123-456',
            });
            mockVendureService.getProducts.mockResolvedValue([]);

            const result = await controller.getProducts('test-store', mockRequest as any);

            expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { subdomain: 'test-store' },
                select: { id: true },
            });
            expect(result.success).toBe(true);
        });

        it('should throw 404 for non-existent tenant', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue(null);

            await expect(controller.getProducts('nonexistent', mockRequest as any))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== PRODUCTS ====================

    describe('getProducts', () => {
        it('should return products for tenant', async () => {
            const products = [
                { id: 1, name: 'Product 1', price: 10000 },
                { id: 2, name: 'Product 2', price: 20000 },
            ];
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getProducts.mockResolvedValue(products);

            const result = await controller.getProducts('test-store', mockRequest as any);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return empty array for store with no products', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getProducts.mockResolvedValue([]);

            const result = await controller.getProducts('empty-store', mockRequest as any);

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });
    });

    describe('createProduct', () => {
        it('should create a new product', async () => {
            const newProduct = { id: 1, name: 'New Product', slug: 'new-product', price: 15000 };
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.createProduct.mockResolvedValue(newProduct);

            const result = await controller.createProduct(
                'test-store',
                { name: 'New Product', slug: 'new-product', price: 15000 },
                mockRequest as any,
            );

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('New Product');
        });

        it('should reject product without required fields', async () => {
            await expect(controller.createProduct(
                'test-store',
                { name: '', slug: '', price: 0 } as any,
                mockRequest as any,
            )).rejects.toThrow(HttpException);
        });
    });

    // ==================== CART ====================

    describe('getCart', () => {
        it('should return cart for session', async () => {
            const cart = { id: 1, items: [], total: 0 };
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getCart.mockResolvedValue(cart);

            const result = await controller.getCart('test-store', 'session-123', mockRequest as any);

            expect(result.success).toBe(true);
            expect(result.sessionId).toBe('session-123');
        });
    });

    describe('addToCart', () => {
        it('should add item to cart', async () => {
            const cartItem = { id: 1, product_id: 1, quantity: 2 };
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.addToCart.mockResolvedValue(cartItem);

            const result = await controller.addToCart('test-store', 'session-123', { productId: 1, quantity: 2 });

            expect(result.success).toBe(true);
            expect(result.data.quantity).toBe(2);
        });

        it('should reject without productId or quantity', async () => {
            await expect(controller.addToCart('test-store', 'session-123', {} as any))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CHECKOUT ====================

    describe('checkout', () => {
        it('should create order from cart', async () => {
            const order = { id: 1, code: 'ORD-001', state: 'Created' };
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.checkout.mockResolvedValue(order);

            const result = await controller.checkout(
                'test-store',
                'session-123',
                { customerEmail: 'customer@test.com' },
            );

            expect(result.success).toBe(true);
            expect(result.data.code).toBe('ORD-001');
        });

        it('should reject checkout without email', async () => {
            await expect(controller.checkout(
                'test-store',
                'session-123',
                {} as any,
            )).rejects.toThrow(HttpException);
        });
    });

    // ==================== ORDERS ====================

    describe('getOrders', () => {
        it('should return all orders for tenant', async () => {
            const orders = [{ id: 1, code: 'ORD-001' }, { id: 2, code: 'ORD-002' }];
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getOrders.mockResolvedValue(orders);

            const result = await controller.getOrders('test-store', mockRequest as any);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });
    });

    describe('getOrderById', () => {
        it('should return specific order', async () => {
            const order = { id: 1, code: 'ORD-001', items: [] };
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getOrderById.mockResolvedValue(order);

            const result = await controller.getOrderById('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data.code).toBe('ORD-001');
        });

        it('should throw 404 for non-existent order', async () => {
            mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 'uuid' });
            mockVendureService.getOrderById.mockResolvedValue(null);

            await expect(controller.getOrderById('test-store', '999'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== HEALTH CHECK ====================

    describe('healthCheck', () => {
        it('should return health status', async () => {
            const result = await controller.healthCheck('test-store');

            expect(result.status).toBe('ok');
            expect(result.service).toBe('vendure-shop-api');
            expect(result.tenantId).toBe('test-store');
        });
    });
});
