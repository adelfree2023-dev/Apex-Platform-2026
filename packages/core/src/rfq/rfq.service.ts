/**
 * RFQ & Wholesale Service
 * Request for Quote and Wholesale Pricing
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RfqItem {
    productId: number;
    quantity: number;
    notes?: string;
}

export interface RfqData {
    customerId?: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    companyName?: string;
    items: RfqItem[];
    message?: string;
}

@Injectable()
export class RfqService {
    private readonly logger = new Logger(RfqService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create RFQ and wholesale tables
     */
    async createRfqTables(tenantSchema: string): Promise<void> {
        // RFQ requests table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_rfq" (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        company_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        message TEXT,
        admin_notes TEXT,
        quoted_total INT,
        valid_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // RFQ items table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_rfq_item" (
        id SERIAL PRIMARY KEY,
        rfq_id INT REFERENCES "${tenantSchema}"."vendure_rfq"(id) ON DELETE CASCADE,
        product_id INT,
        quantity INT NOT NULL,
        unit_price INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Wholesale pricing tiers
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_wholesale_tier" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        min_quantity INT NOT NULL,
        discount_percentage INT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Wholesale customer approval
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_wholesale_customer" (
        id SERIAL PRIMARY KEY,
        customer_id INT UNIQUE NOT NULL,
        tier_id INT REFERENCES "${tenantSchema}"."vendure_wholesale_tier"(id),
        approved_at TIMESTAMP,
        approved_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Insert default wholesale tiers
        const tiers = [
            { name: 'Bronze', minQty: 10, discount: 5 },
            { name: 'Silver', minQty: 50, discount: 10 },
            { name: 'Gold', minQty: 100, discount: 15 },
            { name: 'Platinum', minQty: 500, discount: 20 },
        ];

        for (const tier of tiers) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_wholesale_tier" (name, min_quantity, discount_percentage)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, tier.name, tier.minQty, tier.discount);
        }
    }

    /**
     * Create RFQ request
     */
    async createRfq(tenantSchema: string, data: RfqData): Promise<any> {
        // Create RFQ
        const rfq = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_rfq" 
      (customer_id, customer_name, customer_email, customer_phone, company_name, message, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `,
            data.customerId || null,
            data.customerName,
            data.customerEmail,
            data.customerPhone || null,
            data.companyName || null,
            data.message || null
        );

        const rfqId = Number((rfq as any[])[0].id);

        // Add items
        for (const item of data.items) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_rfq_item" (rfq_id, product_id, quantity, notes)
        VALUES ($1, $2, $3, $4)
      `, rfqId, item.productId, item.quantity, item.notes || null);
        }

        return this.getRfq(tenantSchema, rfqId);
    }

    /**
     * Get RFQ by ID
     */
    async getRfq(tenantSchema: string, rfqId: number): Promise<any | null> {
        try {
            const rfq = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_rfq"
        WHERE id = $1
      `, rfqId);

            if ((rfq as any[]).length === 0) return null;

            const items = await this.getRfqItems(tenantSchema, rfqId);

            return {
                ...this.serializeRfq((rfq as any[])[0]),
                items,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get RFQ items with product details
     */
    async getRfqItems(tenantSchema: string, rfqId: number): Promise<any[]> {
        const items = await this.prisma.$queryRawUnsafe(`
      SELECT 
        ri.id, ri.quantity, ri.unit_price, ri.notes,
        p.id as product_id, p.name as product_name, p.slug as product_slug,
        pv.price as original_price
      FROM "${tenantSchema}"."vendure_rfq_item" ri
      JOIN "${tenantSchema}"."vendure_product" p ON p.id = ri.product_id
      LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
      WHERE ri.rfq_id = $1
    `, rfqId);

        return (items as any[]).map(i => ({
            id: Number(i.id),
            productId: Number(i.product_id),
            productName: i.product_name,
            productSlug: i.product_slug,
            quantity: Number(i.quantity),
            originalPrice: i.original_price ? Number(i.original_price) : null,
            quotedPrice: i.unit_price ? Number(i.unit_price) : null,
            notes: i.notes,
        }));
    }

    /**
     * Get all RFQs
     */
    async getRfqs(tenantSchema: string, status?: string): Promise<any[]> {
        try {
            let whereClause = '1=1';
            if (status) {
                whereClause = `status = '${status}'`;
            }

            const rfqs = await this.prisma.$queryRawUnsafe(`
        SELECT r.*, 
          (SELECT COUNT(*) FROM "${tenantSchema}"."vendure_rfq_item" ri WHERE ri.rfq_id = r.id) as item_count
        FROM "${tenantSchema}"."vendure_rfq" r
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
      `);

            return (rfqs as any[]).map(r => ({
                ...this.serializeRfq(r),
                itemCount: Number(r.item_count || 0),
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Update RFQ status and quote
     */
    async updateRfq(tenantSchema: string, rfqId: number, data: {
        status?: string;
        quotedTotal?: number;
        adminNotes?: string;
        validUntil?: Date;
        itemPrices?: { itemId: number; unitPrice: number }[];
    }): Promise<any> {
        if (data.status || data.quotedTotal || data.adminNotes || data.validUntil) {
            const updates: string[] = ['updated_at = NOW()'];
            const values: any[] = [];
            let paramIndex = 1;

            if (data.status) {
                updates.push(`status = $${paramIndex++}`);
                values.push(data.status);
            }
            if (data.quotedTotal !== undefined) {
                updates.push(`quoted_total = $${paramIndex++}`);
                values.push(data.quotedTotal);
            }
            if (data.adminNotes) {
                updates.push(`admin_notes = $${paramIndex++}`);
                values.push(data.adminNotes);
            }
            if (data.validUntil) {
                updates.push(`valid_until = $${paramIndex++}`);
                values.push(data.validUntil);
            }

            values.push(rfqId);

            await this.prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."vendure_rfq"
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `, ...values);
        }

        // Update item prices
        if (data.itemPrices) {
            for (const item of data.itemPrices) {
                await this.prisma.$executeRawUnsafe(`
          UPDATE "${tenantSchema}"."vendure_rfq_item"
          SET unit_price = $1
          WHERE id = $2
        `, item.unitPrice, item.itemId);
            }
        }

        return this.getRfq(tenantSchema, rfqId);
    }

    /**
     * Get wholesale tiers
     */
    async getWholesaleTiers(tenantSchema: string): Promise<any[]> {
        try {
            const tiers = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_wholesale_tier"
        WHERE is_active = true
        ORDER BY min_quantity ASC
      `);

            return (tiers as any[]).map(t => ({
                id: Number(t.id),
                name: t.name,
                minQuantity: Number(t.min_quantity),
                discountPercentage: Number(t.discount_percentage),
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Apply wholesale discount
     */
    async getWholesalePrice(tenantSchema: string, customerId: number, price: number, quantity: number): Promise<{
        originalPrice: number;
        discountedPrice: number;
        discount: number;
        tier: string | null;
    }> {
        try {
            // Check if customer is approved wholesale
            const customer = await this.prisma.$queryRawUnsafe(`
        SELECT wc.*, wt.name as tier_name, wt.discount_percentage
        FROM "${tenantSchema}"."vendure_wholesale_customer" wc
        JOIN "${tenantSchema}"."vendure_wholesale_tier" wt ON wt.id = wc.tier_id
        WHERE wc.customer_id = $1 AND wc.status = 'approved'
      `, customerId);

            if ((customer as any[]).length > 0) {
                const discount = Number((customer as any[])[0].discount_percentage);
                return {
                    originalPrice: price,
                    discountedPrice: Math.round(price * (1 - discount / 100)),
                    discount,
                    tier: (customer as any[])[0].tier_name,
                };
            }

            // Check quantity-based tier
            const tier = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_wholesale_tier"
        WHERE min_quantity <= $1 AND is_active = true
        ORDER BY min_quantity DESC
        LIMIT 1
      `, quantity);

            if ((tier as any[]).length > 0) {
                const discount = Number((tier as any[])[0].discount_percentage);
                return {
                    originalPrice: price,
                    discountedPrice: Math.round(price * (1 - discount / 100)),
                    discount,
                    tier: (tier as any[])[0].name,
                };
            }

            return { originalPrice: price, discountedPrice: price, discount: 0, tier: null };
        } catch (error) {
            return { originalPrice: price, discountedPrice: price, discount: 0, tier: null };
        }
    }

    /**
     * Apply for wholesale account
     */
    async applyForWholesale(tenantSchema: string, customerId: number): Promise<any> {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_wholesale_customer" (customer_id, status)
      VALUES ($1, 'pending')
      ON CONFLICT (customer_id) DO NOTHING
    `, customerId);

        return { success: true, status: 'pending' };
    }

    private serializeRfq(r: any): any {
        return {
            id: Number(r.id),
            customerId: r.customer_id ? Number(r.customer_id) : null,
            customerName: r.customer_name,
            customerEmail: r.customer_email,
            customerPhone: r.customer_phone,
            companyName: r.company_name,
            status: r.status,
            message: r.message,
            adminNotes: r.admin_notes,
            quotedTotal: r.quoted_total ? Number(r.quoted_total) : null,
            validUntil: r.valid_until,
            createdAt: r.created_at,
        };
    }
}
