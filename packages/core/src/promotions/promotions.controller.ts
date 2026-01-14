/**
 * Promotions Controller
 * API endpoints for coupons, reviews, and inventory
 */

import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PromotionsService, CouponData } from './promotions.service';

@Controller('api/shop')
export class PromotionsController {
    constructor(private readonly promotionsService: PromotionsService) { }

    /**
     * Migrate promotions tables
     */
    @Post(':tenantId/migrate-promotions')
    async migratePromotions(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.promotionsService.createPromotionsTables(tenantSchema);
            return {
                success: true,
                message: 'Coupons, reviews, and inventory tables created',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== COUPON ENDPOINTS ====================

    /**
     * Create coupon
     */
    @Post(':tenantId/coupons')
    async createCoupon(
        @Param('tenantId') tenantId: string,
        @Body() body: CouponData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.code || !body.type || body.discount === undefined) {
            throw new HttpException(
                'Code, type, and discount are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const coupon = await this.promotionsService.createCoupon(tenantSchema, body);
            return {
                success: true,
                data: coupon,
                message: 'Coupon created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create coupon: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Validate coupon
     */
    @Get(':tenantId/coupons/validate')
    async validateCoupon(
        @Param('tenantId') tenantId: string,
        @Query('code') code: string,
        @Query('total') total: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!code) {
            throw new HttpException('Coupon code is required', HttpStatus.BAD_REQUEST);
        }

        const orderTotal = parseInt(total || '0', 10);
        const result = await this.promotionsService.validateCoupon(tenantSchema, code, orderTotal);

        return {
            success: true,
            ...result,
        };
    }

    /**
     * Get all coupons
     */
    @Get(':tenantId/coupons')
    async getCoupons(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const coupons = await this.promotionsService.getCoupons(tenantSchema);
            return {
                success: true,
                data: coupons,
                count: coupons.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Delete coupon
     */
    @Delete(':tenantId/coupons/:couponId')
    async deleteCoupon(
        @Param('tenantId') tenantId: string,
        @Param('couponId') couponId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.promotionsService.deleteCoupon(tenantSchema, parseInt(couponId, 10));
            return {
                success: true,
                message: 'Coupon deleted',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to delete coupon: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== REVIEW ENDPOINTS ====================

    /**
     * Create review
     */
    @Post(':tenantId/products/:productId/reviews')
    async createReview(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
        @Body() body: { customerId: number; rating: number; title?: string; comment?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.customerId || !body.rating) {
            throw new HttpException(
                'Customer ID and rating are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        if (body.rating < 1 || body.rating > 5) {
            throw new HttpException(
                'Rating must be between 1 and 5',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const review = await this.promotionsService.createReview(
                tenantSchema,
                parseInt(productId, 10),
                body.customerId,
                body.rating,
                body.title,
                body.comment,
            );
            return {
                success: true,
                data: review,
                message: 'Review created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create review: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get product reviews
     */
    @Get(':tenantId/products/:productId/reviews')
    async getProductReviews(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const result = await this.promotionsService.getProductReviews(
                tenantSchema,
                parseInt(productId, 10),
            );
            return {
                success: true,
                ...result,
            };
        } catch (error) {
            return {
                success: true,
                reviews: [],
                avgRating: 0,
                count: 0,
            };
        }
    }

    // ==================== INVENTORY ENDPOINTS ====================

    /**
     * Adjust stock
     */
    @Post(':tenantId/inventory/:variantId/adjust')
    async adjustStock(
        @Param('tenantId') tenantId: string,
        @Param('variantId') variantId: string,
        @Body() body: { adjustment: number; reason: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (body.adjustment === undefined || !body.reason) {
            throw new HttpException(
                'Adjustment and reason are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const result = await this.promotionsService.adjustStock(
                tenantSchema,
                parseInt(variantId, 10),
                body.adjustment,
                body.reason,
            );
            return {
                success: true,
                data: result,
                message: `Stock adjusted by ${body.adjustment}`,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to adjust stock: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get inventory history
     */
    @Get(':tenantId/inventory/:variantId/history')
    async getInventoryHistory(
        @Param('tenantId') tenantId: string,
        @Param('variantId') variantId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const history = await this.promotionsService.getInventoryHistory(
                tenantSchema,
                parseInt(variantId, 10),
            );
            return {
                success: true,
                data: history,
            };
        } catch (error) {
            return { success: true, data: [] };
        }
    }

    /**
     * Get low stock products
     */
    @Get(':tenantId/inventory/low-stock')
    async getLowStockProducts(
        @Param('tenantId') tenantId: string,
        @Query('threshold') threshold?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.promotionsService.getLowStockProducts(
                tenantSchema,
                threshold ? parseInt(threshold, 10) : 10,
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
}
