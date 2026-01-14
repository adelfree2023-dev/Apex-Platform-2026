/**
 * Wishlist Controller
 * API endpoints for wishlists
 */

import { Controller, Get, Post, Delete, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { WishlistService } from './wishlist.service';

@Controller('api/shop')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    /**
     * Migrate wishlist table
     */
    @Post(':tenantId/migrate-wishlists')
    async migrateWishlists(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.wishlistService.createWishlistTable(tenantSchema);
            return {
                success: true,
                message: 'Wishlist table created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get customer's wishlist
     */
    @Get(':tenantId/customers/:customerId/wishlist')
    async getWishlist(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const items = await this.wishlistService.getWishlist(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: items,
                count: items.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get wishlist count
     */
    @Get(':tenantId/customers/:customerId/wishlist/count')
    async getWishlistCount(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const count = await this.wishlistService.getWishlistCount(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                count,
            };
        } catch (error) {
            return { success: true, count: 0 };
        }
    }

    /**
     * Add product to wishlist
     */
    @Post(':tenantId/customers/:customerId/wishlist')
    async addToWishlist(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Body() body: { productId: number; variantId?: number; notes?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.productId) {
            throw new HttpException('Product ID is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.wishlistService.addToWishlist(
                tenantSchema,
                parseInt(customerId, 10),
                body.productId,
                body.variantId,
                body.notes,
            );
            return {
                success: true,
                data: result,
                message: result.alreadyExists ? 'Already in wishlist' : 'Added to wishlist',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to add to wishlist: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Remove product from wishlist
     */
    @Delete(':tenantId/customers/:customerId/wishlist/:productId')
    async removeFromWishlist(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Param('productId') productId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.wishlistService.removeFromWishlist(
                tenantSchema,
                parseInt(customerId, 10),
                parseInt(productId, 10),
            );
            return {
                success: true,
                message: 'Removed from wishlist',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to remove: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Check if product is in wishlist
     */
    @Get(':tenantId/customers/:customerId/wishlist/check/:productId')
    async isInWishlist(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Param('productId') productId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const inWishlist = await this.wishlistService.isInWishlist(
                tenantSchema,
                parseInt(customerId, 10),
                parseInt(productId, 10),
            );
            return {
                success: true,
                inWishlist,
            };
        } catch (error) {
            return { success: true, inWishlist: false };
        }
    }

    /**
     * Move item to cart
     */
    @Post(':tenantId/customers/:customerId/wishlist/:productId/move-to-cart')
    async moveToCart(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Param('productId') productId: string,
        @Body() body: { sessionId: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.sessionId) {
            throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.wishlistService.moveToCart(
                tenantSchema,
                parseInt(customerId, 10),
                parseInt(productId, 10),
                body.sessionId,
            );
            return {
                success: true,
                message: 'Moved to cart and removed from wishlist',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to move to cart: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Clear wishlist
     */
    @Delete(':tenantId/customers/:customerId/wishlist')
    async clearWishlist(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.wishlistService.clearWishlist(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                message: 'Wishlist cleared',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to clear wishlist: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
