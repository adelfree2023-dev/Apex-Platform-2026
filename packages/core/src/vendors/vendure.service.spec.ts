/**
 * Vendure Service Unit Tests — CRITICAL P0
 * Tests core e-commerce operations per tenant
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

            // Should create multiple tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

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

    describe('Cart Operations', () => {
        it('should create cart for session', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No existing cart
                .mockResolvedValueOnce([{ id: 1, session_id: 'session-123', total: 0 }]); // Created cart

            const result = await service.getOrCreateCart('tenant_test', 'session-123');

            expect(result).toBeDefined();
        });

        it('should add item to cart', async () => {
            const mockCart = [{ id: 1, session_id: 'session-123', total: 0 }];
            const mockProduct = [{ id: 1, name: 'Product', price: 10000, stock_on_hand: 50 }];
            const mockCartItem = [{ id: 1, cart_id: 1, product_variant_id: 1, quantity: 2 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCart) // getOrCreateCart
                .mockResolvedValueOnce(mockProduct) // Get product
                .mockResolvedValueOnce([]) // No existing item
                .mockResolvedValueOnce(mockCartItem); // Created item

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.addToCart('tenant_test', 'session-123', 1, 2);

            expect(result).toBeDefined();
        });
    });

    describe('Order Operations', () => {
        it('should get order by ID', async () => {
            const mockOrder = [{
                id: 1,
                code: 'ORD-001',
                total: 50000,
                state: 'Active',
                customer_email: 'customer@test.com',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockOrder);

            const result = await service.getOrderById('tenant_test', 1);

            expect(result.code).toBe('ORD-001');
        });

        it('should return null for non-existent order', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getOrderById('tenant_test', 999);

            expect(result).toBeNull();
        });

        it('should update order status', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, code: 'ORD-001', state: 'Shipped',
            }]);

            const result = await service.updateOrderStatus('tenant_test', 1, 'Shipped');

            expect(result.state).toBe('Shipped');
        });
    });

    describe('Checkout Flow', () => {
        it('should create order from cart', async () => {
            const mockCart = [{
                id: 1,
                session_id: 'session-123',
                total: 50000,
                items: [{ product_variant_id: 1, quantity: 2 }],
            }];
            const mockCustomer = [{ id: 1 }];
            const mockOrder = [{ id: 1, code: 'ORD-001', total: 50000, state: 'Active' }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockCart) // Get cart
                .mockResolvedValueOnce([{ product_variant_id: 1, quantity: 2 }]) // Cart items
                .mockResolvedValueOnce(mockCustomer) // Get/create customer
                .mockResolvedValueOnce(mockOrder); // Create order

            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockEventService.record.mockResolvedValue(undefined);

            const result = await service.checkout('tenant_test', 'session-123', 'customer@test.com', 'Cairo');

            expect(result.code).toBe('ORD-001');
        });
    });

    describe('Tenant Isolation Tests', () => {
        it('should use tenant schema in all queries', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getProducts('tenant_store_a');

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.stringContaining('tenant_store_a')
            );
        });

        it('should not allow cross-tenant queries', async () => {
            // This test documents that all queries are scoped to tenant schema
            const tenantA = 'tenant_store_a';
            const tenantB = 'tenant_store_b';

            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await service.getProducts(tenantA);
            await service.getProducts(tenantB);

            // Verify each call uses the correct schema
            const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
            expect(calls[0][0]).toContain(tenantA);
            expect(calls[1][0]).toContain(tenantB);
        });
    });
});
