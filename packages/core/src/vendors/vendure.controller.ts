/**
 * Vendure Controller
 * Shop API endpoints for tenant e-commerce operations
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Req, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { VendureService, ProductInput } from './vendure.service';

@Controller('api/shop')
export class VendureController {
    constructor(private readonly vendureService: VendureService) { }

    /**
     * Get all products for tenant
     */
    @Get(':tenantId/products')
    async getProducts(@Param('tenantId') tenantId: string, @Req() req: Request) {
        const tenantSchema = req.tenantSchema || `tenant_${tenantId.replace(/-/g, '_')}`;

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
        const tenantSchema = req.tenantSchema || `tenant_${tenantId.replace(/-/g, '_')}`;

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
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
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
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
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
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

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
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

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
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
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
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

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
}


