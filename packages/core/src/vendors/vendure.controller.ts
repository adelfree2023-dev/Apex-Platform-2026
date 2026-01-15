/**
 * Vendure Controller
 * Shop API endpoints for tenant e-commerce operations
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Req, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { VendureService, ProductInput } from './vendure.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/shop')
export class VendureController {
    constructor(
        private readonly vendureService: VendureService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Helper: Resolve tenant schema from subdomain
     * Looks up tenant by subdomain and returns UUID-based schema
     */
    private async resolveTenantSchema(subdomain: string): Promise<string> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true },
        });

        if (!tenant) {
            throw new HttpException(`Tenant not found: ${subdomain}`, HttpStatus.NOT_FOUND);
        }

        return `tenant_${tenant.id.replace(/-/g, '_')}`;
    }

    /**
     * Get all products for tenant
     */
    @Get(':tenantId/products')
    async getProducts(@Param('tenantId') tenantId: string, @Req() req: Request) {
        const tenantSchema = req.tenantSchema || await this.resolveTenantSchema(tenantId);

        try {
            const products = await this.vendureService.getProducts(tenantSchema);
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get products: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create a product for tenant
     */
    @Post(':tenantId/products')
    async createProduct(
        @Param('tenantId') tenantId: string,
        @Body() input: ProductInput,
        @Req() req: Request,
    ) {
        const tenantSchema = req.tenantSchema || await this.resolveTenantSchema(tenantId);

        if (!input.name || !input.slug || !input.price) {
            throw new HttpException(
                'Missing required fields: name, slug, price',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const product = await this.vendureService.createProduct(tenantSchema, input);
            return {
                success: true,
                data: product,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create product: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== CART ENDPOINTS (Phase 02) ====================

    /**
     * Get cart for session
     */
    @Get(':tenantId/cart')
    async getCart(
        @Param('tenantId') tenantId: string,
        @Headers('x-session-id') sessionId: string,
        @Req() req: Request,
    ) {
        const tenantSchema = await this.resolveTenantSchema(tenantId);
        const session = sessionId || `session_${Date.now()}`;

        try {
            const cart = await this.vendureService.getCart(tenantSchema, session);
            return {
                success: true,
                data: cart,
                sessionId: session,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get cart: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Add item to cart
     */
    @Post(':tenantId/cart')
    async addToCart(
        @Param('tenantId') tenantId: string,
        @Headers('x-session-id') sessionId: string,
        @Body() body: { productId: number; quantity: number },
    ) {
        const tenantSchema = await this.resolveTenantSchema(tenantId);
        const session = sessionId || `session_${Date.now()}`;

        if (!body.productId || !body.quantity) {
            throw new HttpException(
                'Missing required fields: productId, quantity',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const cartItem = await this.vendureService.addToCart(
                tenantSchema,
                session,
                body.productId,
                body.quantity,
            );
            return {
                success: true,
                data: cartItem,
                sessionId: session,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to add to cart: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Update cart item quantity
     */
    @Put(':tenantId/cart/:itemId')
    async updateCartItem(
        @Param('tenantId') tenantId: string,
        @Param('itemId') itemId: string,
        @Body() body: { quantity: number },
    ) {
        const tenantSchema = await this.resolveTenantSchema(tenantId);

        try {
            const item = await this.vendureService.updateCartItem(
                tenantSchema,
                parseInt(itemId, 10),
                body.quantity,
            );
            return {
                success: true,
                data: item,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to update cart item: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Remove item from cart
     */
    @Delete(':tenantId/cart/:itemId')
    async removeFromCart(
        @Param('tenantId') tenantId: string,
        @Param('itemId') itemId: string,
    ) {
        const tenantSchema = await this.resolveTenantSchema(tenantId);

        try {
            const result = await this.vendureService.removeCartItem(
                tenantSchema,
                parseInt(itemId, 10),
            );
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to remove from cart: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Checkout - Create order from cart
     */
    @Post(':tenantId/checkout')
    async checkout(
        @Param('tenantId') tenantId: string,
        @Headers('x-session-id') sessionId: string,
        @Body() body: { customerEmail: string; territory?: string },
    ) {
        const tenantSchema = await this.resolveTenantSchema(tenantId);
        const session = sessionId || `session_${Date.now()}`;

        if (!body.customerEmail) {
            throw new HttpException(
                'Missing required field: customerEmail',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const order = await this.vendureService.checkout(
                tenantSchema,
                session,
                body.customerEmail,
                body.territory || 'default',
            );
            return {
                success: true,
                data: order,
                message: 'Order created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to checkout: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== ORDER ENDPOINTS ====================

    /**
     * Get all orders for tenant
     */
    @Get(':tenantId/orders')
    async getOrders(@Param('tenantId') tenantId: string, @Req() req: Request) {
        const tenantSchema = req.tenantSchema || `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const orders = await this.vendureService.getOrders(tenantSchema);
            return {
                success: true,
                data: orders,
                count: orders.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get orders: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get order by ID
     */
    @Get(':tenantId/orders/:orderId')
    async getOrderById(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
    ) {
        const tenantSchema = await this.resolveTenantSchema(tenantId);

        try {
            const order = await this.vendureService.getOrderById(
                tenantSchema,
                parseInt(orderId, 10),
            );
            if (!order) {
                throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: order,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get order: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Health check for shop API
     */
    @Get(':tenantId/health')
    async healthCheck(@Param('tenantId') tenantId: string) {
        return {
            status: 'ok',
            service: 'vendure-shop-api',
            tenantId,
            timestamp: new Date().toISOString(),
        };
    }

    // ==================== CATEGORY ENDPOINTS (Phase 05) ====================

    /**
     * Get all categories for tenant
     */
    @Get(':tenantId/categories')
    async getCategories(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const categories = await this.vendureService.getCategories(tenantSchema);
            return {
                success: true,
                data: categories,
                count: categories.length,
            };
        } catch (error) {
            // If table doesn't exist, return empty array
            return {
                success: true,
                data: [],
                count: 0,
            };
        }
    }

    /**
     * Get products by category
     */
    @Get(':tenantId/categories/:slug/products')
    async getProductsByCategory(
        @Param('tenantId') tenantId: string,
        @Param('slug') slug: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.vendureService.getProductsByCategory(tenantSchema, slug);
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get products by category: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create category
     */
    @Post(':tenantId/categories')
    async createCategory(
        @Param('tenantId') tenantId: string,
        @Body() body: { name: string; slug: string; description?: string; parentId?: number; imageUrl?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.slug) {
            throw new HttpException(
                'Missing required fields: name, slug',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            // Ensure category table exists
            await this.vendureService.createCategoryTable(tenantSchema);
            const category = await this.vendureService.createCategory(tenantSchema, body);
            return {
                success: true,
                data: category,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create category: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Migrate tenant to add category table
     */
    @Post(':tenantId/migrate-categories')
    async migrateCategories(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.vendureService.createCategoryTable(tenantSchema);
            return {
                success: true,
                message: 'Category table created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to migrate categories: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== SEARCH ENDPOINTS (Phase 05) ====================

    /**
     * Search products
     */
    @Get(':tenantId/products/search')
    async searchProducts(
        @Param('tenantId') tenantId: string,
        @Req() req: Request,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
        const query = req.query.q as string || '';

        if (!query || query.length < 2) {
            return {
                success: true,
                data: [],
                count: 0,
                message: 'Search query must be at least 2 characters',
            };
        }

        try {
            const products = await this.vendureService.searchProducts(tenantSchema, query);
            return {
                success: true,
                data: products,
                count: products.length,
                query,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to search products: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== WALLET ENDPOINTS (Phase 07) ====================

    /**
     * Migrate to add wallet tables
     */
    @Post(':tenantId/migrate-wallet')
    async migrateWallet(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.vendureService.createWalletTable(tenantSchema);
            return {
                success: true,
                message: 'Wallet and gift card tables created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to migrate wallet: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get wallet balance
     */
    @Get(':tenantId/wallet/:customerId')
    async getWallet(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const wallet = await this.vendureService.getOrCreateWallet(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: wallet,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get wallet: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Add funds to wallet
     */
    @Post(':tenantId/wallet/:customerId/add-funds')
    async addFunds(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Body() body: { amount: number; description?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.amount || body.amount <= 0) {
            throw new HttpException(
                'Amount must be greater than 0',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const wallet = await this.vendureService.addFunds(
                tenantSchema,
                parseInt(customerId, 10),
                body.amount,
                body.description || 'Funds added',
            );
            return {
                success: true,
                data: wallet,
                message: `Added ${body.amount} to wallet`,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to add funds: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get wallet transactions
     */
    @Get(':tenantId/wallet/:customerId/transactions')
    async getTransactions(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const transactions = await this.vendureService.getWalletTransactions(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: transactions,
                count: transactions.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get transactions: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== GIFT CARD ENDPOINTS (Phase 07) ====================

    /**
     * Create gift card
     */
    @Post(':tenantId/gift-cards')
    async createGiftCard(
        @Param('tenantId') tenantId: string,
        @Body() body: { value: number; expiresAt?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.value || body.value <= 0) {
            throw new HttpException(
                'Value must be greater than 0',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
            const giftCard = await this.vendureService.createGiftCard(
                tenantSchema,
                body.value,
                expiresAt,
            );
            return {
                success: true,
                data: giftCard,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create gift card: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get gift card by code
     */
    @Get(':tenantId/gift-cards/:code')
    async getGiftCard(
        @Param('tenantId') tenantId: string,
        @Param('code') code: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const giftCard = await this.vendureService.getGiftCard(tenantSchema, code);
            if (!giftCard) {
                throw new HttpException('Gift card not found', HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: giftCard,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get gift card: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Redeem gift card
     */
    @Post(':tenantId/gift-cards/:code/redeem')
    async redeemGiftCard(
        @Param('tenantId') tenantId: string,
        @Param('code') code: string,
        @Body() body: { customerId: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.customerId) {
            throw new HttpException(
                'Customer ID is required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const result = await this.vendureService.redeemGiftCard(
                tenantSchema,
                code,
                body.customerId,
            );
            return {
                success: true,
                data: result,
                message: 'Gift card redeemed successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to redeem gift card: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    // ==================== ORDER FULFILLMENT ENDPOINTS (Phase 09) ====================

    /**
     * Migrate to add fulfillment tables
     */
    @Post(':tenantId/migrate-fulfillment')
    async migrateFulfillment(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.vendureService.createFulfillmentTable(tenantSchema);
            return {
                success: true,
                message: 'Fulfillment and returns tables created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to migrate fulfillment: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Update order status
     */
    @Put(':tenantId/orders/:orderId/status')
    async updateOrderStatus(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
        @Body() body: { status: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.status) {
            throw new HttpException(
                'Status is required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const order = await this.vendureService.updateOrderStatus(
                tenantSchema,
                parseInt(orderId, 10),
                body.status,
            );
            return {
                success: true,
                data: order,
                message: `Order status updated to ${body.status}`,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to update order status: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Ship order (create fulfillment)
     */
    @Post(':tenantId/orders/:orderId/ship')
    async shipOrder(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
        @Body() body: { trackingCode?: string; carrier?: string; notes?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const fulfillment = await this.vendureService.createFulfillment(
                tenantSchema,
                parseInt(orderId, 10),
                body,
            );
            return {
                success: true,
                data: fulfillment,
                message: 'Order shipped successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to ship order: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Mark order as delivered
     */
    @Post(':tenantId/orders/:orderId/deliver')
    async deliverOrder(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const order = await this.vendureService.markDelivered(
                tenantSchema,
                parseInt(orderId, 10),
            );
            return {
                success: true,
                data: order,
                message: 'Order marked as delivered',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to mark as delivered: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get order fulfillment details
     */
    @Get(':tenantId/orders/:orderId/fulfillment')
    async getOrderFulfillment(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const fulfillment = await this.vendureService.getFulfillment(
                tenantSchema,
                parseInt(orderId, 10),
            );
            return {
                success: true,
                data: fulfillment,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get fulfillment: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create return request
     */
    @Post(':tenantId/orders/:orderId/return')
    async createReturn(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
        @Body() body: { reason: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.reason) {
            throw new HttpException(
                'Reason is required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const returnRequest = await this.vendureService.createReturn(
                tenantSchema,
                parseInt(orderId, 10),
                body.reason,
            );
            return {
                success: true,
                data: returnRequest,
                message: 'Return request created',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create return: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Process refund
     */
    @Post(':tenantId/returns/:returnId/refund')
    async processRefund(
        @Param('tenantId') tenantId: string,
        @Param('returnId') returnId: string,
        @Body() body: { refundAmount: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.refundAmount || body.refundAmount <= 0) {
            throw new HttpException(
                'Refund amount must be greater than 0',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const returnRequest = await this.vendureService.processRefund(
                tenantSchema,
                parseInt(returnId, 10),
                body.refundAmount,
            );
            return {
                success: true,
                data: returnRequest,
                message: 'Refund processed successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to process refund: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}




