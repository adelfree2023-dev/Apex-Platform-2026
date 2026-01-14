/**
 * Vendure Controller
 * Shop API endpoints for tenant e-commerce operations
 */

import { Controller, Get, Post, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
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
     * Create an order for tenant
     */
    @Post(':tenantId/orders')
    async createOrder(
        @Param('tenantId') tenantId: string,
        @Body() body: { customerId: number; territory?: string },
        @Req() req: Request,
    ) {
        const tenantSchema = req.tenantSchema || `tenant_${tenantId.replace(/-/g, '_')}`;
        const territory = body.territory || req.territory || 'default';

        try {
            const order = await this.vendureService.createOrder(tenantSchema, body.customerId, territory);
            return {
                success: true,
                data: order,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create order: ${error}`,
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
}
