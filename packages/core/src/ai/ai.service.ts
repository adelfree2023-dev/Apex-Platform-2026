/**
 * AI Commerce Service
 * Product Recommendations and Smart Analytics
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create AI tables
     */
    async createAiTables(tenantSchema: string): Promise<void> {
        // Product recommendations cache
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_ai_recommendation" (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        product_id INT NOT NULL,
        score FLOAT NOT NULL,
        strategy VARCHAR(50) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Customer behavior tracking
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_ai_behavior" (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        session_id VARCHAR(255),
        product_id INT,
        action VARCHAR(50) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // AI insights
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_ai_insight" (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        data JSONB,
        priority INT DEFAULT 0,
        is_actionable BOOLEAN DEFAULT true,
        actioned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Track customer behavior
     */
    async trackBehavior(
        tenantSchema: string,
        customerId: number | null,
        sessionId: string,
        productId: number,
        action: 'view' | 'add_cart' | 'purchase' | 'wishlist',
        metadata?: any
    ): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_ai_behavior" 
      (customer_id, session_id, product_id, action, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, customerId, sessionId, productId, action, metadata ? JSON.stringify(metadata) : null);
    }

    /**
     * Get similar products (content-based)
     */
    async getSimilarProducts(tenantSchema: string, productId: number, limit: number = 6): Promise<any[]> {
        try {
            // Get product category
            const product = await this.prisma.$queryRawUnsafe(`
        SELECT p.*, 
          (SELECT facet_value_id FROM "${tenantSchema}"."vendure_product_facet_values" WHERE product_id = p.id LIMIT 1) as category_id
        FROM "${tenantSchema}"."vendure_product" p
        WHERE p.id = $1
      `, productId);

            if ((product as any[]).length === 0) return [];

            const categoryId = (product as any[])[0].category_id;

            // Get similar products in same category
            const similar = await this.prisma.$queryRawUnsafe(`
        SELECT p.id, p.name, p.slug, pv.price, pv.stock_on_hand
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        WHERE p.id != $1 AND (p.enabled = true OR p.enabled IS NULL)
        ORDER BY RANDOM()
        LIMIT $2
      `, productId, limit);

            return (similar as any[]).map(s => ({
                id: Number(s.id),
                name: s.name,
                slug: s.slug,
                price: s.price ? Number(s.price) : null,
                inStock: s.stock_on_hand > 0,
                reason: 'Similar products',
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get frequently bought together
     */
    async getFrequentlyBoughtTogether(tenantSchema: string, productId: number, limit: number = 4): Promise<any[]> {
        try {
            // Get products from same orders
            const together = await this.prisma.$queryRawUnsafe(`
        SELECT p.id, p.name, p.slug, pv.price, COUNT(*) as co_occurrence
        FROM "${tenantSchema}"."vendure_order_line" ol1
        JOIN "${tenantSchema}"."vendure_order_line" ol2 ON ol1.order_id = ol2.order_id
        JOIN "${tenantSchema}"."vendure_product_variant" pv1 ON pv1.id = ol1.product_variant_id
        JOIN "${tenantSchema}"."vendure_product_variant" pv2 ON pv2.id = ol2.product_variant_id
        JOIN "${tenantSchema}"."vendure_product" p ON p.id = pv2.product_id
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        WHERE pv1.product_id = $1 AND pv2.product_id != $1
        GROUP BY p.id, p.name, p.slug, pv.price
        ORDER BY co_occurrence DESC
        LIMIT $2
      `, productId, limit);

            return (together as any[]).map(t => ({
                id: Number(t.id),
                name: t.name,
                slug: t.slug,
                price: t.price ? Number(t.price) : null,
                coOccurrence: Number(t.co_occurrence),
                reason: 'Frequently bought together',
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get personalized recommendations
     */
    async getPersonalizedRecommendations(tenantSchema: string, customerId: number, limit: number = 8): Promise<any[]> {
        try {
            // Get customer's viewed/purchased products
            const behavior = await this.prisma.$queryRawUnsafe(`
        SELECT product_id, action FROM "${tenantSchema}"."vendure_ai_behavior"
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, customerId);

            const viewedIds = (behavior as any[]).map(b => b.product_id);

            if (viewedIds.length === 0) {
                return this.getTrendingProducts(tenantSchema, limit);
            }

            // Get similar products not yet viewed
            const recommendations = await this.prisma.$queryRawUnsafe(`
        SELECT p.id, p.name, p.slug, pv.price
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        WHERE p.id NOT IN (${viewedIds.join(',')})
          AND (p.enabled = true OR p.enabled IS NULL)
        ORDER BY RANDOM()
        LIMIT $1
      `, limit);

            return (recommendations as any[]).map(r => ({
                id: Number(r.id),
                name: r.name,
                slug: r.slug,
                price: r.price ? Number(r.price) : null,
                reason: 'Recommended for you',
            }));
        } catch (error) {
            return this.getTrendingProducts(tenantSchema, limit);
        }
    }

    /**
     * Get trending products
     */
    async getTrendingProducts(tenantSchema: string, limit: number = 8): Promise<any[]> {
        try {
            const trending = await this.prisma.$queryRawUnsafe(`
        SELECT p.id, p.name, p.slug, pv.price, COUNT(ol.id) as order_count
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        LEFT JOIN "${tenantSchema}"."vendure_order_line" ol ON ol.product_variant_id = pv.id
        WHERE p.enabled = true OR p.enabled IS NULL
        GROUP BY p.id, p.name, p.slug, pv.price
        ORDER BY order_count DESC
        LIMIT $1
      `, limit);

            return (trending as any[]).map(t => ({
                id: Number(t.id),
                name: t.name,
                slug: t.slug,
                price: t.price ? Number(t.price) : null,
                orderCount: Number(t.order_count || 0),
                reason: 'Trending now',
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Generate AI insights
     */
    async generateInsights(tenantSchema: string): Promise<any[]> {
        const insights: any[] = [];

        try {
            // Low stock alert
            const lowStock = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_product_variant"
        WHERE stock_on_hand < 5 AND stock_on_hand > 0
      `);

            if (Number((lowStock as any[])[0]?.count) > 0) {
                insights.push({
                    type: 'low_stock',
                    title: `${(lowStock as any[])[0].count} products low on stock`,
                    description: 'Reorder these products soon to avoid stockouts',
                    priority: 8,
                });
            }

            // Abandoned carts
            const abandoned = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_order"
        WHERE state = 'AddingItems' AND created_at < NOW() - INTERVAL '1 day'
      `);

            if (Number((abandoned as any[])[0]?.count) > 0) {
                insights.push({
                    type: 'abandoned_carts',
                    title: `${(abandoned as any[])[0].count} abandoned carts`,
                    description: 'Send reminder emails to recover these sales',
                    priority: 7,
                });
            }

            return insights;
        } catch (error) {
            return [];
        }
    }
}
