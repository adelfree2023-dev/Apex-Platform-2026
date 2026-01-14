/**
 * Bundle Service
 * Handles product bundles with discounted pricing
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BundleItem {
    productVariantId: number;
    quantity: number;
}

export interface BundleData {
    name: string;
    description?: string;
    slug: string;
    bundlePrice: number;      // Fixed bundle price
    items: BundleItem[];
    isActive?: boolean;
}

@Injectable()
export class BundleService {
    private readonly logger = new Logger(BundleService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create bundle tables
     */
    async createBundleTables(tenantSchema: string): Promise<void> {
        // Bundles table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_bundle" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        bundle_price INT NOT NULL,
        original_price INT,
        discount_percentage INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Bundle items table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_bundle_item" (
        id SERIAL PRIMARY KEY,
        bundle_id INT REFERENCES "${tenantSchema}"."vendure_bundle"(id) ON DELETE CASCADE,
        product_variant_id INT REFERENCES "${tenantSchema}"."vendure_product_variant"(id),
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Create bundle
     */
    async createBundle(tenantSchema: string, data: BundleData): Promise<any> {
        // Calculate original price from items
        let originalPrice = 0;
        for (const item of data.items) {
            const variant = await this.prisma.$queryRawUnsafe(`
        SELECT price FROM "${tenantSchema}"."vendure_product_variant"
        WHERE id = $1
      `, item.productVariantId);

            if ((variant as any[]).length > 0) {
                originalPrice += Number((variant as any[])[0].price) * item.quantity;
            }
        }

        const discountPercentage = originalPrice > 0
            ? Math.round((1 - data.bundlePrice / originalPrice) * 100)
            : 0;

        // Create bundle
        const bundle = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_bundle" 
      (name, slug, description, bundle_price, original_price, discount_percentage, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
            data.name,
            data.slug,
            data.description || null,
            data.bundlePrice,
            originalPrice,
            discountPercentage,
            data.isActive !== false
        );

        const bundleId = Number((bundle as any[])[0].id);

        // Add bundle items
        for (const item of data.items) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_bundle_item" 
        (bundle_id, product_variant_id, quantity)
        VALUES ($1, $2, $3)
      `, bundleId, item.productVariantId, item.quantity);
        }

        return this.getBundle(tenantSchema, bundleId);
    }

    /**
     * Get bundle by ID
     */
    async getBundle(tenantSchema: string, bundleId: number): Promise<any | null> {
        try {
            const bundle = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_bundle"
        WHERE id = $1
      `, bundleId);

            if ((bundle as any[]).length === 0) return null;

            const items = await this.getBundleItems(tenantSchema, bundleId);

            return {
                ...this.serializeBundle((bundle as any[])[0]),
                items,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get bundle by slug
     */
    async getBundleBySlug(tenantSchema: string, slug: string): Promise<any | null> {
        try {
            const bundle = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_bundle"
        WHERE slug = $1 AND is_active = true
      `, slug);

            if ((bundle as any[]).length === 0) return null;

            const bundleId = Number((bundle as any[])[0].id);
            const items = await this.getBundleItems(tenantSchema, bundleId);

            return {
                ...this.serializeBundle((bundle as any[])[0]),
                items,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get bundle items with product details
     */
    async getBundleItems(tenantSchema: string, bundleId: number): Promise<any[]> {
        const items = await this.prisma.$queryRawUnsafe(`
      SELECT 
        bi.id,
        bi.quantity,
        pv.id as variant_id,
        pv.sku,
        pv.price,
        pv.stock_on_hand,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug
      FROM "${tenantSchema}"."vendure_bundle_item" bi
      JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.id = bi.product_variant_id
      JOIN "${tenantSchema}"."vendure_product" p ON p.id = pv.product_id
      WHERE bi.bundle_id = $1
    `, bundleId);

        return (items as any[]).map(i => ({
            id: Number(i.id),
            quantity: Number(i.quantity),
            variantId: Number(i.variant_id),
            sku: i.sku,
            price: Number(i.price),
            stockOnHand: Number(i.stock_on_hand),
            productId: Number(i.product_id),
            productName: i.product_name,
            productSlug: i.product_slug,
        }));
    }

    /**
     * Get all active bundles
     */
    async getBundles(tenantSchema: string): Promise<any[]> {
        try {
            const bundles = await this.prisma.$queryRawUnsafe(`
        SELECT b.*, 
          (SELECT COUNT(*) FROM "${tenantSchema}"."vendure_bundle_item" bi WHERE bi.bundle_id = b.id) as item_count
        FROM "${tenantSchema}"."vendure_bundle" b
        WHERE b.is_active = true
        ORDER BY b.created_at DESC
      `);

            const results = [];
            for (const bundle of bundles as any[]) {
                const items = await this.getBundleItems(tenantSchema, Number(bundle.id));
                results.push({
                    ...this.serializeBundle(bundle),
                    items,
                });
            }

            return results;
        } catch (error) {
            return [];
        }
    }

    /**
     * Update bundle
     */
    async updateBundle(tenantSchema: string, bundleId: number, data: Partial<BundleData>): Promise<any> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.bundlePrice !== undefined) {
            updates.push(`bundle_price = $${paramIndex++}`);
            values.push(data.bundlePrice);
        }
        if (data.isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(data.isActive);
        }

        updates.push('updated_at = NOW()');
        values.push(bundleId);

        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_bundle"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, ...values);

        return this.getBundle(tenantSchema, bundleId);
    }

    /**
     * Delete bundle
     */
    async deleteBundle(tenantSchema: string, bundleId: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}"."vendure_bundle"
      WHERE id = $1
    `, bundleId);
    }

    /**
     * Add bundle to cart
     */
    async addBundleToCart(tenantSchema: string, sessionId: string, bundleId: number): Promise<any> {
        const bundle = await this.getBundle(tenantSchema, bundleId);
        if (!bundle) {
            throw new Error('Bundle not found');
        }

        // Check stock for all items
        for (const item of bundle.items) {
            if (item.stockOnHand < item.quantity) {
                throw new Error(`Insufficient stock for ${item.productName}`);
            }
        }

        // Add all bundle items to cart
        for (const item of bundle.items) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_cart" (session_id, product_variant_id, quantity, bundle_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (session_id, product_variant_id) 
        DO UPDATE SET quantity = vendure_cart.quantity + $3
      `, sessionId, item.variantId, item.quantity, bundleId);
        }

        return { success: true, bundle: bundle.name };
    }

    private serializeBundle(b: any): any {
        return {
            id: Number(b.id),
            name: b.name,
            slug: b.slug,
            description: b.description,
            bundlePrice: Number(b.bundle_price),
            originalPrice: Number(b.original_price || 0),
            discountPercentage: Number(b.discount_percentage || 0),
            isActive: b.is_active,
            itemCount: Number(b.item_count || 0),
            createdAt: b.created_at,
        };
    }
}
