/**
 * Bundle Controller
 * API endpoints for product bundles
 */

import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { BundleService, BundleData } from './bundle.service';

@Controller('api/shop')
export class BundleController {
    constructor(private readonly bundleService: BundleService) { }

    /**
     * Migrate bundle tables
     */
    @Post(':tenantId/migrate-bundles')
    async migrateBundles(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.bundleService.createBundleTables(tenantSchema);
            return {
                success: true,
                message: 'Bundle tables created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get all bundles
     */
    @Get(':tenantId/bundles')
    async getBundles(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const bundles = await this.bundleService.getBundles(tenantSchema);
            return {
                success: true,
                data: bundles,
                count: bundles.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get bundle by ID
     */
    @Get(':tenantId/bundles/:bundleId')
    async getBundle(
        @Param('tenantId') tenantId: string,
        @Param('bundleId') bundleId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            // Check if it's a slug or ID
            const isId = /^\d+$/.test(bundleId);
            const bundle = isId
                ? await this.bundleService.getBundle(tenantSchema, parseInt(bundleId, 10))
                : await this.bundleService.getBundleBySlug(tenantSchema, bundleId);

            return {
                success: true,
                data: bundle,
                found: !!bundle,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Create bundle
     */
    @Post(':tenantId/bundles')
    async createBundle(
        @Param('tenantId') tenantId: string,
        @Body() body: BundleData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.slug || !body.bundlePrice || !body.items || body.items.length === 0) {
            throw new HttpException(
                'Name, slug, bundlePrice, and items are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const bundle = await this.bundleService.createBundle(tenantSchema, body);
            return {
                success: true,
                data: bundle,
                message: 'Bundle created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create bundle: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Update bundle
     */
    @Put(':tenantId/bundles/:bundleId')
    async updateBundle(
        @Param('tenantId') tenantId: string,
        @Param('bundleId') bundleId: string,
        @Body() body: Partial<BundleData>,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const bundle = await this.bundleService.updateBundle(
                tenantSchema,
                parseInt(bundleId, 10),
                body,
            );
            return {
                success: true,
                data: bundle,
                message: 'Bundle updated',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to update bundle: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Delete bundle
     */
    @Delete(':tenantId/bundles/:bundleId')
    async deleteBundle(
        @Param('tenantId') tenantId: string,
        @Param('bundleId') bundleId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.bundleService.deleteBundle(tenantSchema, parseInt(bundleId, 10));
            return {
                success: true,
                message: 'Bundle deleted',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to delete bundle: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Add bundle to cart
     */
    @Post(':tenantId/bundles/:bundleId/add-to-cart')
    async addBundleToCart(
        @Param('tenantId') tenantId: string,
        @Param('bundleId') bundleId: string,
        @Body() body: { sessionId: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.sessionId) {
            throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.bundleService.addBundleToCart(
                tenantSchema,
                body.sessionId,
                parseInt(bundleId, 10),
            );
            return {
                success: true,
                data: result,
                message: 'Bundle added to cart',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to add bundle: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
