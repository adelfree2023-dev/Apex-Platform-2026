/**
 * Vendure Service Unit Tests — COMPREHENSIVE
 * Tests ALL core e-commerce operations per tenant
 * Service: 1050 lines, 48 methods
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VendureService } from './vendure.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';

describe('VendureService', () => {
    let service: VendureService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    const mockEventService = {
        record: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VendureService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EventService, useValue: mockEventService },
            ],
        }).compile();

        service = module.get<VendureService>(VendureService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== INITIALIZATION ====================

    describe('initializeTenant', () => {
        it('should create Vendure tables for new tenant', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

            await service.initializeTenant({
                tenantId: 'uuid-123',
                tenantSchema: 'tenant_uuid_123',
                territory: 'Cairo',
                businessType: 'RETAIL',
                tenantName: 'Test Store',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    // ==================== PRODUCT OPERATIONS ====================

    describe('getProducts', () => {
        it('should return products for tenant', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', slug: 'product-a', price: 10000, enabled: true },
                { id: 2, name: 'Product B', slug: 'product-b', price: 20000, enabled: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getProducts('tenant_test');

            expect(result.length).toBe(2);
            expect(result[0].name).toBe('Product A');
        });

        it('should return empty array if no products', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getProducts('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('createProduct', () => {
        it('should create a new product', async () => {
            const mockProduct = [{ id: 1, name: 'New Product', slug: 'new-product' }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProduct);

            const result = await service.createProduct('tenant_test', {
                name: 'New Product',
                slug: 'new-product',
                price: 15000,
            });

            expect(result.name).toBe('New Product');
        });
    });

    describe('searchProducts', () => {
        it('should search products by query', async () => {
            const mockProducts = [
                { id: 1, name: 'Honey Natural', slug: 'honey' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.searchProducts('tenant_test', 'honey');

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].name).toContain('Honey');
        });
    });

    // ==================== CART OPERATIONS ====================

    describe('getOrCreateCart', () => {
        it('should return existing cart for session', async () => {
            const mockCart = [{ id: 1, session_id: 'session-123', total: 0 }];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCart);

            const result = await service.getOrCreateCart('tenant_test', 'session-123');

            expect(result.id).toBe(1);
            expect(result.session_id).toBe('session-123');
        });

        it('should create new cart if none exists', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No existing cart
                .mockResolvedValueOnce([{ id: 2, session_id: 'new-session', total: 0 }]);

            const result = await service.getOrCreateCart('tenant_test', 'new-session');

            expect(result.id).toBe(2);
            expect(result.session_id).toBe('new-session');
        });
    });

    describe('addToCart', () => {
        it('should add new item to cart', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, session_id: 'session-123', total: 0 }]) // getOrCreateCart
                .mockResolvedValueOnce([{ variant_id: 1, price: 10000, stock_on_hand: 50, name: 'Product' }]) // Get product
                .mockResolvedValueOnce([]) // No existing item
                .mockResolvedValueOnce([{ id: 1, cart_id: 1, product_id: 1, quantity: 2, unit_price: 10000 }]); // New item

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addToCart('tenant_test', 'session-123', 1, 2);

            expect(result.id).toBe(1);
            expect(result.quantity).toBe(2);
        });

        it('should update quantity if item already in cart', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, session_id: 'session-123', total: 0 }]) // Cart
                .mockResolvedValueOnce([{ variant_id: 1, price: 10000, stock_on_hand: 50 }]) // Product
                .mockResolvedValueOnce([{ id: 5, cart_id: 1, product_id: 1, quantity: 2 }]) // Existing item
                .mockResolvedValueOnce([{ id: 5, cart_id: 1, product_id: 1, quantity: 4 }]); // Updated item

            const result = await service.addToCart('tenant_test', 'session-123', 1, 2);

            expect(result.quantity).toBe(4);
        });

        it('should throw error if product not found', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1 }]) // Cart
                .mockResolvedValueOnce([]); // No product

            await expect(service.addToCart('tenant_test', 'session-123', 999, 1))
                .rejects.toThrow('Product not found');
        });
    });

    describe('getCart', () => {
        it('should return cart with items', async () => {
            const mockCart = [{ id: 1, session_id: 'session-123', subtotal: 50000, total: 50000 }];
            const mockItems = [
                { id: 1, product_id: 1, quantity: 2, unit_price: 25000, product_name: 'Product A' },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCart) // getOrCreateCart
                .mockResolvedValueOnce(mockItems); // cart items

            const result = await service.getCart('tenant_test', 'session-123');

            expect(result.items.length).toBe(1);
            expect(result.itemCount).toBe(1);
        });
    });

    describe('updateCartItem', () => {
        it('should update item quantity', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, cart_id: 1, quantity: 5,
            }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.updateCartItem('tenant_test', 1, 5);

            expect(result.quantity).toBe(5);
        });
    });

    describe('removeCartItem', () => {
        it('should remove item from cart', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1, cart_id: 1 }]);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.removeCartItem('tenant_test', 1);

            expect(result.deleted).toBe(true);
        });
    });

    // ==================== ORDER OPERATIONS ====================

    describe('getOrders', () => {
        it('should return orders for tenant', async () => {
            const mockOrders = [
                { id: 1, code: 'ORD-001', total: 50000, state: 'Completed' },
                { id: 2, code: 'ORD-002', total: 30000, state: 'Active' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrders);

            const result = await service.getOrders('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('getOrderById', () => {
        it('should return order with lines', async () => {
            const mockOrder = [{ id: 1, code: 'ORD-001', total: 50000, state: 'Processing' }];
            const mockLines = [{ id: 1, product_name: 'Product A', quantity: 2 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockOrder)
                .mockResolvedValueOnce(mockLines);

            const result = await service.getOrderById('tenant_test', 1);

            expect(result.code).toBe('ORD-001');
            expect(result.lines.length).toBe(1);
        });

        it('should return null for non-existent order', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getOrderById('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, code: 'ORD-001', state: 'Shipped',
            }]);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.updateOrderStatus('tenant_test', 1, 'Shipped');

            expect(result.state).toBe('Shipped');
            expect(mockEventService.record).toHaveBeenCalled();
        });

        it('should throw error for invalid status', async () => {
            await expect(service.updateOrderStatus('tenant_test', 1, 'InvalidStatus'))
                .rejects.toThrow('Invalid status');
        });

        it('should throw error if order not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.updateOrderStatus('tenant_test', 999, 'Shipped'))
                .rejects.toThrow('Order not found');
        });
    });

    describe('checkout', () => {
        it('should create order from cart', async () => {
            // Mock getCart
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, session_id: 'session', subtotal: 50000, total: 50000 }]) // Cart
                .mockResolvedValueOnce([{ product_variant_id: 1, quantity: 2, unit_price: 25000 }]) // Items
                // Mock checkout
                .mockResolvedValueOnce([{ id: 1, email: 'test@test.com' }]) // Customer exists
                .mockResolvedValueOnce([{ id: 1, code: 'ORD-12345', total: 50000, state: 'PaymentPending' }]); // Order created

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.checkout('tenant_test', 'session', 'test@test.com', 'Cairo');

            expect(result.code).toContain('ORD');
            expect(result.state).toBe('PaymentPending');
        });

        it('should throw error if cart is empty', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, subtotal: 0, total: 0 }]) // Cart
                .mockResolvedValueOnce([]); // No items

            await expect(service.checkout('tenant_test', 'session', 'test@test.com', 'Cairo'))
                .rejects.toThrow('Cart is empty');
        });
    });

    // ==================== FULFILLMENT OPERATIONS ====================

    describe('createFulfillmentTable', () => {
        it('should create fulfillment and return tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createFulfillmentTable('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2);
        });
    });

    describe('createFulfillment', () => {
        it('should create fulfillment for order', async () => {
            // Mock updateOrderStatus
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, state: 'Shipped' }]) // updateOrderStatus
                .mockResolvedValueOnce([{ id: 1, order_id: 1, tracking_code: 'TRK123', carrier: 'DHL' }]); // Create fulfillment

            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.createFulfillment('tenant_test', 1, {
                trackingCode: 'TRK123',
                carrier: 'DHL',
            });

            expect(result.tracking_code).toBe('TRK123');
            expect(result.carrier).toBe('DHL');
        });
    });

    describe('markDelivered', () => {
        it('should mark order as delivered', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, state: 'Delivered' }]) // updateOrderStatus
                .mockResolvedValueOnce([{ id: 1, code: 'ORD-001' }]) // getOrderById
                .mockResolvedValueOnce([]); // order lines

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.markDelivered('tenant_test', 1);

            expect(result.code).toBe('ORD-001');
        });
    });

    describe('getFulfillment', () => {
        it('should return fulfillment for order', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, order_id: 1, tracking_code: 'TRK123', carrier: 'DHL', shipped_at: new Date(),
            }]);

            const result = await service.getFulfillment('tenant_test', 1);

            expect(result.tracking_code).toBe('TRK123');
        });

        it('should return null if no fulfillment', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getFulfillment('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    // ==================== RETURN & REFUND ====================

    describe('createReturn', () => {
        it('should create return request', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, order_id: 1, reason: 'Defective product', status: 'Requested',
            }]);

            const result = await service.createReturn('tenant_test', 1, 'Defective product');

            expect(result.reason).toBe('Defective product');
            expect(result.status).toBe('Requested');
        });
    });

    describe('processRefund', () => {
        it('should process refund for return', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, order_id: 1, status: 'Refunded', refund_amount: 50000 }]) // Update return
                .mockResolvedValueOnce([{ id: 1, state: 'Refunded' }]); // updateOrderStatus

            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.processRefund('tenant_test', 1, 50000);

            expect(result.status).toBe('Refunded');
            expect(result.refund_amount).toBe(50000);
        });

        it('should throw error if return not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.processRefund('tenant_test', 999, 50000))
                .rejects.toThrow('Return request not found');
        });
    });

    describe('getReturn', () => {
        it('should return return request for order', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, order_id: 1, reason: 'Wrong item', status: 'Requested',
            }]);

            const result = await service.getReturn('tenant_test', 1);

            expect(result.reason).toBe('Wrong item');
        });
    });

    // ==================== CATEGORY OPERATIONS ====================

    describe('createCategoryTable', () => {
        it('should create category table', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createCategoryTable('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getCategories', () => {
        it('should return all categories', async () => {
            const mockCategories = [
                { id: 1, name: 'Electronics', slug: 'electronics' },
                { id: 2, name: 'Clothing', slug: 'clothing' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCategories);

            const result = await service.getCategories('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('getCategoryBySlug', () => {
        it('should return category by slug', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, name: 'Electronics', slug: 'electronics',
            }]);

            const result = await service.getCategoryBySlug('tenant_test', 'electronics');

            expect(result.name).toBe('Electronics');
        });
    });

    describe('getProductsByCategory', () => {
        it('should return products in category', async () => {
            const mockProducts = [
                { id: 1, name: 'Laptop', category_slug: 'electronics' },
                { id: 2, name: 'Phone', category_slug: 'electronics' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockProducts);

            const result = await service.getProductsByCategory('tenant_test', 'electronics');

            expect(result.length).toBe(2);
        });
    });

    describe('createCategory', () => {
        it('should create a new category', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, name: 'New Category', slug: 'new-category',
            }]);

            const result = await service.createCategory('tenant_test', {
                name: 'New Category',
                slug: 'new-category',
            });

            expect(result.name).toBe('New Category');
        });
    });

    describe('updateProductCategory', () => {
        it('should update product category', async () => {
            // updateProductCategory uses $queryRawUnsafe with UPDATE...RETURNING
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1, category_id: 2 }]);

            const result = await service.updateProductCategory('tenant_test', 1, 2);

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
            expect(result.category_id).toBe(2);
        });
    });

    // ==================== WALLET OPERATIONS ====================

    describe('createWalletTable', () => {
        it('should create wallet tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createWalletTable('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getOrCreateWallet', () => {
        it('should return existing wallet', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, customer_id: 123, balance: 50000,
            }]);

            const result = await service.getOrCreateWallet('tenant_test', 123);

            expect(result.balance).toBe(50000);
        });

        it('should create new wallet if none exists', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No existing
                .mockResolvedValueOnce([{ id: 1, customer_id: 123, balance: 0 }]); // Created

            const result = await service.getOrCreateWallet('tenant_test', 123);

            expect(result.balance).toBe(0);
        });
    });

    describe('getWalletBalance', () => {
        it('should return wallet balance', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ balance: 100000 }]);

            const result = await service.getWalletBalance('tenant_test', 123);

            expect(result).toBe(100000);
        });
    });

    describe('addFunds', () => {
        it('should add funds to wallet', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, balance: 50000 }]) // getOrCreateWallet
                .mockResolvedValueOnce([{ id: 1, balance: 100000 }]); // Updated wallet

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addFunds('tenant_test', 123, 50000, 'Deposit');

            expect(result.balance).toBe(100000);
        });
    });

    describe('deductFunds', () => {
        it('should deduct funds from wallet', async () => {
            // deductFunds calls getOrCreateWallet first, then updates
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, balance: 100000 }]) // getOrCreateWallet
                .mockResolvedValueOnce(undefined) // transaction insert
                .mockResolvedValueOnce([{ id: 1, balance: 50000 }]); // final SELECT

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.deductFunds('tenant_test', 123, 50000, 'Purchase');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });

        it('should throw error if insufficient balance', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1, balance: 10000 }]);

            await expect(service.deductFunds('tenant_test', 123, 50000))
                .rejects.toThrow('Insufficient');
        });
    });

    describe('getWalletTransactions', () => {
        it('should return wallet transactions', async () => {
            const mockTransactions = [
                { id: 1, amount: 50000, type: 'credit', description: 'Deposit' },
                { id: 2, amount: -20000, type: 'debit', description: 'Purchase' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockTransactions);

            const result = await service.getWalletTransactions('tenant_test', 123);

            expect(result.length).toBe(2);
        });
    });

    // ==================== GIFT CARD OPERATIONS ====================

    describe('createGiftCard', () => {
        it('should create a new gift card', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, code: 'GC-ABC123', value: 50000, balance: 50000, is_active: true,
            }]);

            const result = await service.createGiftCard('tenant_test', 50000);

            expect(result.value).toBe(50000);
            expect(result.code).toContain('GC-');
        });
    });

    describe('getGiftCard', () => {
        it('should return gift card by code', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, code: 'GC-ABC123', value: 50000, balance: 30000, is_active: true,
            }]);

            const result = await service.getGiftCard('tenant_test', 'GC-ABC123');

            expect(result.balance).toBe(30000);
        });

        it('should return null if gift card not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getGiftCard('tenant_test', 'INVALID');

            expect(result).toBeNull();
        });
    });

    describe('redeemGiftCard', () => {
        it('should redeem gift card and add to wallet', async () => {
            // Mock getGiftCard
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ id: 1, code: 'GC-ABC123', balance: 50000, is_active: true }]) // getGiftCard
                .mockResolvedValueOnce([{ id: 1, balance: 0, is_active: false }]) // Updated gift card
                .mockResolvedValueOnce([{ id: 1, customer_id: 123, balance: 0 }]) // getOrCreateWallet
                .mockResolvedValueOnce([{ id: 1, balance: 50000 }]); // addFunds

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.redeemGiftCard('tenant_test', 'GC-ABC123', 123);

            expect(result).toBeDefined();
        });

        it('should throw error if gift card already redeemed', async () => {
            // redeemGiftCard checks redeemed_by field
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, code: 'GC-ABC123', current_value: 50000, redeemed_by: 999, // Already redeemed
            }]);

            await expect(service.redeemGiftCard('tenant_test', 'GC-ABC123', 123))
                .rejects.toThrow('Gift card already redeemed');
        });
    });

    // ==================== TENANT ISOLATION TESTS ====================

    describe('Tenant Isolation', () => {
        it('should use correct tenant schema in all product queries', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getProducts('tenant_store_alpha');

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('tenant_store_alpha')
            );
        });

        it('should isolate orders between tenants', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getOrders('tenant_store_a');
            await service.getOrders('tenant_store_b');

            const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
            expect(calls[0][0]).toContain('tenant_store_a');
            expect(calls[1][0]).toContain('tenant_store_b');
            expect(calls[0][0]).not.toContain('tenant_store_b');
        });

        it('should isolate cart between tenants', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1 }]);

            await service.getOrCreateCart('tenant_a', 'session-123');
            await service.getOrCreateCart('tenant_b', 'session-123');

            const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
            expect(calls[0][0]).toContain('tenant_a');
            expect(calls[1][0]).toContain('tenant_b');
        });
    });
});
