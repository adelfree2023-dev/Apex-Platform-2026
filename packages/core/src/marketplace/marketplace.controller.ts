/**
 * Marketplace Controller
 * API endpoints for multi-vendor marketplace
 */

import { Controller, Get, Post, Put, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { MarketplaceService, VendorData } from './marketplace.service';

@Controller('api/shop')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) { }

    /**
     * Migrate marketplace tables
     */
    @Post(':tenantId/migrate-marketplace')
    async migrateMarketplace(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.marketplaceService.createMarketplaceTables(tenantSchema);
            return {
                success: true,
                message: 'Marketplace tables created',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== VENDOR REGISTRATION ====================

    /**
     * Register as vendor
     */
    @Post(':tenantId/vendors/register')
    async registerVendor(
        @Param('tenantId') tenantId: string,
        @Body() body: VendorData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.email) {
            throw new HttpException('Name and email are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const vendor = await this.marketplaceService.registerVendor(tenantSchema, body);
            return {
                success: true,
                data: vendor,
                message: 'Vendor registration submitted! We will review within 24-48 hours.',
            };
        } catch (error) {
            throw new HttpException(
                `Registration failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get all vendors
     */
    @Get(':tenantId/vendors')
    async getVendors(
        @Param('tenantId') tenantId: string,
        @Query('status') status?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const vendors = await this.marketplaceService.getVendors(tenantSchema, status);
            return {
                success: true,
                data: vendors,
                count: vendors.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get vendor by ID
     */
    @Get(':tenantId/vendors/:vendorId')
    async getVendor(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const vendor = await this.marketplaceService.getVendor(
                tenantSchema,
                parseInt(vendorId, 10),
            );
            return {
                success: true,
                data: vendor,
                found: !!vendor,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Get vendor by slug
     */
    @Get(':tenantId/store/:slug')
    async getVendorBySlug(
        @Param('tenantId') tenantId: string,
        @Param('slug') slug: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const vendor = await this.marketplaceService.getVendorBySlug(tenantSchema, slug);
            return {
                success: true,
                data: vendor,
                found: !!vendor,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Approve vendor (admin)
     */
    @Put(':tenantId/vendors/:vendorId/approve')
    async approveVendor(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const vendor = await this.marketplaceService.approveVendor(
                tenantSchema,
                parseInt(vendorId, 10),
            );
            return {
                success: true,
                data: vendor,
                message: 'Vendor approved',
            };
        } catch (error) {
            throw new HttpException(
                `Approval failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== VENDOR PRODUCTS ====================

    /**
     * Add product to vendor
     */
    @Post(':tenantId/vendors/:vendorId/products')
    async addVendorProduct(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
        @Body() body: { productId: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.productId) {
            throw new HttpException('Product ID is required', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.marketplaceService.addVendorProduct(
                tenantSchema,
                parseInt(vendorId, 10),
                body.productId,
            );
            return {
                success: true,
                message: 'Product added to vendor',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to add product: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get vendor products
     */
    @Get(':tenantId/vendors/:vendorId/products')
    async getVendorProducts(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.marketplaceService.getVendorProducts(
                tenantSchema,
                parseInt(vendorId, 10),
            );
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    // ==================== VENDOR ORDERS ====================

    /**
     * Get vendor orders
     */
    @Get(':tenantId/vendors/:vendorId/orders')
    async getVendorOrders(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const orders = await this.marketplaceService.getVendorOrders(
                tenantSchema,
                parseInt(vendorId, 10),
            );
            return {
                success: true,
                data: orders,
                count: orders.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    // ==================== VENDOR DASHBOARD ====================

    /**
     * Get vendor dashboard
     */
    @Get(':tenantId/vendors/:vendorId/dashboard')
    async getVendorDashboard(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const stats = await this.marketplaceService.getVendorDashboard(
                tenantSchema,
                parseInt(vendorId, 10),
            );
            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            return { success: true, data: null };
        }
    }

    /**
     * Request payout
     */
    @Post(':tenantId/vendors/:vendorId/payout')
    async requestPayout(
        @Param('tenantId') tenantId: string,
        @Param('vendorId') vendorId: string,
        @Body() body: { amount: number; method: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.amount || !body.method) {
            throw new HttpException('Amount and method are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const payout = await this.marketplaceService.requestPayout(
                tenantSchema,
                parseInt(vendorId, 10),
                body.amount,
                body.method,
            );
            return {
                success: true,
                data: payout,
                message: 'Payout request submitted',
            };
        } catch (error) {
            throw new HttpException(
                `Payout failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
