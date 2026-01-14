/**
 * Wishlist Service
 * Save products for later purchase
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
    private readonly logger = new Logger(WishlistService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create wishlist table
     */
    async createWishlistTable(tenantSchema: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_wishlist" (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL,
        product_id INT NOT NULL,
        product_variant_id INT,
        notes TEXT,
        priority INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, product_id)
      )
    `);
    }

    /**
     * Add product to wishlist
     */
    async addToWishlist(
        tenantSchema: string,
        customerId: number,
        productId: number,
        variantId?: number,
        notes?: string
    ): Promise<any> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_wishlist" 
        (customer_id, product_id, product_variant_id, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (customer_id, product_id) DO NOTHING
        RETURNING *
      `, customerId, productId, variantId || null, notes || null);

            if ((result as any[]).length === 0) {
                // Already in wishlist
                return { success: true, alreadyExists: true };
            }

            return {
                success: true,
                id: Number((result as any[])[0].id),
                alreadyExists: false,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Remove from wishlist
     */
    async removeFromWishlist(tenantSchema: string, customerId: number, productId: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}"."vendure_wishlist"
      WHERE customer_id = $1 AND product_id = $2
    `, customerId, productId);
    }

    /**
     * Get customer's wishlist
     */
    async getWishlist(tenantSchema: string, customerId: number): Promise<any[]> {
        try {
            const items = await this.prisma.$queryRawUnsafe(`
        SELECT 
          w.id,
          w.product_id,
          w.product_variant_id,
          w.notes,
          w.priority,
          w.created_at,
          p.name as product_name,
          p.slug as product_slug,
          p.enabled,
          pv.price,
          pv.stock_on_hand,
          pv.sku
        FROM "${tenantSchema}"."vendure_wishlist" w
        JOIN "${tenantSchema}"."vendure_product" p ON p.id = w.product_id
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.id = w.product_variant_id
        WHERE w.customer_id = $1
        ORDER BY w.priority DESC, w.created_at DESC
      `, customerId);

            return (items as any[]).map(i => ({
                id: Number(i.id),
                productId: Number(i.product_id),
                productVariantId: i.product_variant_id ? Number(i.product_variant_id) : null,
                productName: i.product_name,
                productSlug: i.product_slug,
                price: i.price ? Number(i.price) : null,
                stockOnHand: i.stock_on_hand ? Number(i.stock_on_hand) : null,
                sku: i.sku,
                notes: i.notes,
                priority: Number(i.priority),
                inStock: i.stock_on_hand > 0,
                addedAt: i.created_at,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Check if product is in wishlist
     */
    async isInWishlist(tenantSchema: string, customerId: number, productId: number): Promise<boolean> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT 1 FROM "${tenantSchema}"."vendure_wishlist"
        WHERE customer_id = $1 AND product_id = $2
      `, customerId, productId);

            return (result as any[]).length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get wishlist count
     */
    async getWishlistCount(tenantSchema: string, customerId: number): Promise<number> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_wishlist"
        WHERE customer_id = $1
      `, customerId);

            return Number((result as any[])[0]?.count || 0);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Move item to cart
     */
    async moveToCart(tenantSchema: string, customerId: number, productId: number, sessionId: string): Promise<void> {
        // Get the wishlist item
        const item = await this.prisma.$queryRawUnsafe(`
      SELECT product_variant_id FROM "${tenantSchema}"."vendure_wishlist"
      WHERE customer_id = $1 AND product_id = $2
    `, customerId, productId);

        if ((item as any[]).length === 0) {
            throw new Error('Item not in wishlist');
        }

        const variantId = (item as any[])[0].product_variant_id;

        if (!variantId) {
            // Get default variant
            const variant = await this.prisma.$queryRawUnsafe(`
        SELECT id FROM "${tenantSchema}"."vendure_product_variant"
        WHERE product_id = $1 LIMIT 1
      `, productId);

            if ((variant as any[]).length === 0) {
                throw new Error('No variant found');
            }
        }

        // Add to cart
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_cart" (session_id, product_variant_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (session_id, product_variant_id) 
      DO UPDATE SET quantity = vendure_cart.quantity + 1
    `, sessionId, variantId);

        // Remove from wishlist
        await this.removeFromWishlist(tenantSchema, customerId, productId);
    }

    /**
     * Clear wishlist
     */
    async clearWishlist(tenantSchema: string, customerId: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}"."vendure_wishlist"
      WHERE customer_id = $1
    `, customerId);
    }

    /**
     * Update priority
     */
    async updatePriority(tenantSchema: string, customerId: number, productId: number, priority: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_wishlist"
      SET priority = $3
      WHERE customer_id = $1 AND product_id = $2
    `, customerId, productId, priority);
    }
}
