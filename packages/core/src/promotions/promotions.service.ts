/**
 * Promotions Service
 * Handles coupons, discounts, and promotions
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CouponData {
    code: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    discount: number; // Percentage (0-100) or fixed amount in cents
    minOrderAmount?: number;
    maxDiscount?: number; // Cap for percentage discounts
    expiryDate?: string;
    usageLimit?: number;
}

@Injectable()
export class PromotionsService {
    private readonly logger = new Logger(PromotionsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create promotions tables
     */
    async createPromotionsTables(tenantSchema: string): Promise<void> {
        // Coupons table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_coupon" (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        discount INT NOT NULL,
        min_order_amount INT DEFAULT 0,
        max_discount INT,
        expiry_date TIMESTAMP,
        usage_limit INT,
        used_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Reviews table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_review" (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES "${tenantSchema}"."vendure_product"(id),
        customer_id INT REFERENCES "${tenantSchema}"."vendure_customer"(id),
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        is_verified BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Inventory log table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_inventory_log" (
        id SERIAL PRIMARY KEY,
        product_variant_id INT REFERENCES "${tenantSchema}"."vendure_product_variant"(id),
        adjustment INT NOT NULL,
        reason VARCHAR(255),
        reference_type VARCHAR(50),
        reference_id INT,
        stock_before INT,
        stock_after INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    // ==================== COUPON METHODS ====================

    /**
     * Create coupon
     */
    async createCoupon(tenantSchema: string, data: CouponData): Promise<any> {
        const coupon = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_coupon" 
      (code, type, discount, min_order_amount, max_discount, expiry_date, usage_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
            data.code.toUpperCase(),
            data.type,
            data.discount,
            data.minOrderAmount || 0,
            data.maxDiscount || null,
            data.expiryDate ? new Date(data.expiryDate) : null,
            data.usageLimit || null
        );

        return this.serializeCoupon((coupon as any[])[0]);
    }

    /**
     * Validate coupon
     */
    async validateCoupon(tenantSchema: string, code: string, orderTotal: number): Promise<{ valid: boolean; coupon?: any; discount?: number; message?: string }> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_coupon"
        WHERE code = $1 AND is_active = true
      `, code.toUpperCase());

            const coupon = (result as any[])[0];

            if (!coupon) {
                return { valid: false, message: 'Coupon not found' };
            }

            // Check expiry
            if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
                return { valid: false, message: 'Coupon has expired' };
            }

            // Check usage limit
            if (coupon.usage_limit && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
                return { valid: false, message: 'Coupon usage limit reached' };
            }

            // Check min order amount
            if (coupon.min_order_amount && orderTotal < Number(coupon.min_order_amount)) {
                return {
                    valid: false,
                    message: `Minimum order amount is EGP ${(Number(coupon.min_order_amount) / 100).toFixed(2)}`
                };
            }

            // Calculate discount
            let discount = 0;
            if (coupon.type === 'percentage') {
                discount = Math.round(orderTotal * Number(coupon.discount) / 100);
                if (coupon.max_discount) {
                    discount = Math.min(discount, Number(coupon.max_discount));
                }
            } else if (coupon.type === 'fixed') {
                discount = Number(coupon.discount);
            }

            return {
                valid: true,
                coupon: this.serializeCoupon(coupon),
                discount,
            };
        } catch (error) {
            return { valid: false, message: 'Failed to validate coupon' };
        }
    }

    /**
     * Apply coupon (increment usage)
     */
    async applyCoupon(tenantSchema: string, code: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_coupon"
      SET used_count = used_count + 1, updated_at = NOW()
      WHERE code = $1
    `, code.toUpperCase());
    }

    /**
     * Get all coupons
     */
    async getCoupons(tenantSchema: string): Promise<any[]> {
        const coupons = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_coupon"
      ORDER BY created_at DESC
    `);

        return (coupons as any[]).map(c => this.serializeCoupon(c));
    }

    /**
     * Delete coupon
     */
    async deleteCoupon(tenantSchema: string, couponId: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_coupon"
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, couponId);
    }

    private serializeCoupon(coupon: any): any {
        return {
            id: Number(coupon.id),
            code: coupon.code,
            type: coupon.type,
            discount: Number(coupon.discount),
            minOrderAmount: Number(coupon.min_order_amount || 0),
            maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null,
            expiryDate: coupon.expiry_date,
            usageLimit: coupon.usage_limit ? Number(coupon.usage_limit) : null,
            usedCount: Number(coupon.used_count || 0),
            isActive: coupon.is_active,
            createdAt: coupon.created_at,
        };
    }

    // ==================== REVIEW METHODS ====================

    /**
     * Create review
     */
    async createReview(tenantSchema: string, productId: number, customerId: number, rating: number, title?: string, comment?: string): Promise<any> {
        // Check if customer already reviewed this product
        const existing = await this.prisma.$queryRawUnsafe(`
      SELECT id FROM "${tenantSchema}"."vendure_review"
      WHERE product_id = $1 AND customer_id = $2
    `, productId, customerId);

        if ((existing as any[]).length > 0) {
            throw new Error('You have already reviewed this product');
        }

        // Check if customer purchased this product (verified review)
        const purchased = await this.prisma.$queryRawUnsafe(`
      SELECT ol.id FROM "${tenantSchema}"."vendure_order_line" ol
      JOIN "${tenantSchema}"."vendure_order" o ON o.id = ol.order_id
      JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.id = ol.product_variant_id
      WHERE o.customer_id = $1 AND pv.product_id = $2 AND o.state = 'Delivered'
    `, customerId, productId);

        const isVerified = (purchased as any[]).length > 0;

        const review = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_review" 
      (product_id, customer_id, rating, title, comment, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, productId, customerId, rating, title || null, comment || null, isVerified);

        return this.serializeReview((review as any[])[0]);
    }

    /**
     * Get product reviews
     */
    async getProductReviews(tenantSchema: string, productId: number): Promise<{ reviews: any[]; avgRating: number; count: number }> {
        const reviews = await this.prisma.$queryRawUnsafe(`
      SELECT r.*, c.email as customer_email, c.first_name
      FROM "${tenantSchema}"."vendure_review" r
      LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = r.customer_id
      WHERE r.product_id = $1 AND r.is_approved = true
      ORDER BY r.created_at DESC
    `, productId);

        const stats = await this.prisma.$queryRawUnsafe(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as count
      FROM "${tenantSchema}"."vendure_review"
      WHERE product_id = $1 AND is_approved = true
    `, productId);

        return {
            reviews: (reviews as any[]).map(r => this.serializeReview(r)),
            avgRating: parseFloat((stats as any[])[0]?.avg_rating || '0'),
            count: Number((stats as any[])[0]?.count || 0),
        };
    }

    private serializeReview(review: any): any {
        return {
            id: Number(review.id),
            productId: Number(review.product_id),
            customerId: Number(review.customer_id),
            customerEmail: review.customer_email,
            customerName: review.first_name || 'Anonymous',
            rating: Number(review.rating),
            title: review.title,
            comment: review.comment,
            isVerified: review.is_verified,
            createdAt: review.created_at,
        };
    }

    // ==================== INVENTORY METHODS ====================

    /**
     * Adjust stock
     */
    async adjustStock(tenantSchema: string, variantId: number, adjustment: number, reason: string): Promise<any> {
        // Get current stock
        const current = await this.prisma.$queryRawUnsafe(`
      SELECT stock_on_hand FROM "${tenantSchema}"."vendure_product_variant"
      WHERE id = $1
    `, variantId);

        const stockBefore = Number((current as any[])[0]?.stock_on_hand || 0);
        const stockAfter = stockBefore + adjustment;

        // Update stock
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_product_variant"
      SET stock_on_hand = $1, updated_at = NOW()
      WHERE id = $2
    `, stockAfter, variantId);

        // Log the adjustment
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_inventory_log"
      (product_variant_id, adjustment, reason, stock_before, stock_after)
      VALUES ($1, $2, $3, $4, $5)
    `, variantId, adjustment, reason, stockBefore, stockAfter);

        return { variantId, stockBefore, stockAfter, adjustment };
    }

    /**
     * Get inventory history
     */
    async getInventoryHistory(tenantSchema: string, variantId: number): Promise<any[]> {
        const logs = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_inventory_log"
      WHERE product_variant_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, variantId);

        return (logs as any[]).map(log => ({
            id: Number(log.id),
            variantId: Number(log.product_variant_id),
            adjustment: Number(log.adjustment),
            reason: log.reason,
            stockBefore: Number(log.stock_before),
            stockAfter: Number(log.stock_after),
            createdAt: log.created_at,
        }));
    }

    /**
     * Get low stock products
     */
    async getLowStockProducts(tenantSchema: string, threshold: number = 10): Promise<any[]> {
        const products = await this.prisma.$queryRawUnsafe(`
      SELECT p.id, p.name, pv.id as variant_id, pv.sku, pv.stock_on_hand
      FROM "${tenantSchema}"."vendure_product" p
      JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
      WHERE pv.stock_on_hand <= $1
      ORDER BY pv.stock_on_hand ASC
    `, threshold);

        return (products as any[]).map(p => ({
            productId: Number(p.id),
            productName: p.name,
            variantId: Number(p.variant_id),
            sku: p.sku,
            stockOnHand: Number(p.stock_on_hand),
        }));
    }
}
