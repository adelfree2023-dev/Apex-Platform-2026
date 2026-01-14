/**
 * Multi-Vendor Marketplace Service
 * Vendor registration, products, orders, and commissions
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VendorData {
    userId?: number;
    name: string;
    email: string;
    phone?: string;
    description?: string;
    logo?: string;
    commissionRate?: number;
}

@Injectable()
export class MarketplaceService {
    private readonly logger = new Logger(MarketplaceService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create marketplace tables
     */
    async createMarketplaceTables(tenantSchema: string): Promise<void> {
        // Vendors
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_vendor" (
        id SERIAL PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        description TEXT,
        logo VARCHAR(500),
        commission_rate INT DEFAULT 15,
        status VARCHAR(50) DEFAULT 'pending',
        total_sales INT DEFAULT 0,
        total_products INT DEFAULT 0,
        rating FLOAT DEFAULT 0,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Vendor products (link products to vendors)
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_vendor_product" (
        id SERIAL PRIMARY KEY,
        vendor_id INT REFERENCES "${tenantSchema}"."vendure_vendor"(id),
        product_id INT NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Vendor orders (split of marketplace orders)
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_vendor_order" (
        id SERIAL PRIMARY KEY,
        vendor_id INT REFERENCES "${tenantSchema}"."vendure_vendor"(id),
        order_id INT NOT NULL,
        subtotal INT NOT NULL,
        commission INT NOT NULL,
        payout INT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Vendor payouts
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_vendor_payout" (
        id SERIAL PRIMARY KEY,
        vendor_id INT REFERENCES "${tenantSchema}"."vendure_vendor"(id),
        amount INT NOT NULL,
        method VARCHAR(50),
        reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'processing',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Generate unique slug
     */
    private generateSlug(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
    }

    /**
     * Register as vendor
     */
    async registerVendor(tenantSchema: string, data: VendorData): Promise<any> {
        const slug = this.generateSlug(data.name);

        const vendor = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_vendor" 
      (user_id, name, slug, email, phone, description, logo, commission_rate, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `,
            data.userId || null,
            data.name,
            slug,
            data.email,
            data.phone || null,
            data.description || null,
            data.logo || null,
            data.commissionRate || 15
        );

        return this.serializeVendor((vendor as any[])[0]);
    }

    /**
     * Get vendor by ID
     */
    async getVendor(tenantSchema: string, vendorId: number): Promise<any | null> {
        try {
            const vendor = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_vendor"
        WHERE id = $1
      `, vendorId);

            if ((vendor as any[]).length === 0) return null;
            return this.serializeVendor((vendor as any[])[0]);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get vendor by slug
     */
    async getVendorBySlug(tenantSchema: string, slug: string): Promise<any | null> {
        try {
            const vendor = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_vendor"
        WHERE slug = $1 AND status = 'approved'
      `, slug);

            if ((vendor as any[]).length === 0) return null;
            return this.serializeVendor((vendor as any[])[0]);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get all vendors
     */
    async getVendors(tenantSchema: string, status?: string): Promise<any[]> {
        try {
            let whereClause = '1=1';
            if (status) whereClause += ` AND status = '${status}'`;

            const vendors = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_vendor"
        WHERE ${whereClause}
        ORDER BY created_at DESC
      `);

            return (vendors as any[]).map(v => this.serializeVendor(v));
        } catch (error) {
            return [];
        }
    }

    /**
     * Approve vendor
     */
    async approveVendor(tenantSchema: string, vendorId: number): Promise<any> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_vendor"
      SET status = 'approved', approved_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, vendorId);

        return this.getVendor(tenantSchema, vendorId);
    }

    /**
     * Add product to vendor
     */
    async addVendorProduct(tenantSchema: string, vendorId: number, productId: number): Promise<any> {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_vendor_product" (vendor_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, vendorId, productId);

        // Update vendor product count
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_vendor"
      SET total_products = (
        SELECT COUNT(*) FROM "${tenantSchema}"."vendure_vendor_product" WHERE vendor_id = $1
      ), updated_at = NOW()
      WHERE id = $1
    `, vendorId);

        return { success: true };
    }

    /**
     * Get vendor products
     */
    async getVendorProducts(tenantSchema: string, vendorId: number): Promise<any[]> {
        try {
            const products = await this.prisma.$queryRawUnsafe(`
        SELECT p.id, p.name, p.slug, pv.price, pv.stock_on_hand, vp.status
        FROM "${tenantSchema}"."vendure_vendor_product" vp
        JOIN "${tenantSchema}"."vendure_product" p ON p.id = vp.product_id
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        WHERE vp.vendor_id = $1
        ORDER BY vp.created_at DESC
      `, vendorId);

            return (products as any[]).map(p => ({
                id: Number(p.id),
                name: p.name,
                slug: p.slug,
                price: p.price ? Number(p.price) : null,
                stock: Number(p.stock_on_hand || 0),
                status: p.status,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get vendor orders
     */
    async getVendorOrders(tenantSchema: string, vendorId: number): Promise<any[]> {
        try {
            const orders = await this.prisma.$queryRawUnsafe(`
        SELECT vo.*, o.code as order_code
        FROM "${tenantSchema}"."vendure_vendor_order" vo
        LEFT JOIN "${tenantSchema}"."vendure_order" o ON o.id = vo.order_id
        WHERE vo.vendor_id = $1
        ORDER BY vo.created_at DESC
      `, vendorId);

            return (orders as any[]).map(o => ({
                id: Number(o.id),
                orderId: Number(o.order_id),
                orderCode: o.order_code,
                subtotal: Number(o.subtotal),
                commission: Number(o.commission),
                payout: Number(o.payout),
                status: o.status,
                paidAt: o.paid_at,
                createdAt: o.created_at,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get vendor dashboard stats
     */
    async getVendorDashboard(tenantSchema: string, vendorId: number): Promise<any> {
        try {
            const vendor = await this.getVendor(tenantSchema, vendorId);
            if (!vendor) return null;

            const pendingPayout = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(payout), 0) as total
        FROM "${tenantSchema}"."vendure_vendor_order"
        WHERE vendor_id = $1 AND status = 'pending'
      `, vendorId);

            const paidPayout = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM "${tenantSchema}"."vendure_vendor_payout"
        WHERE vendor_id = $1 AND status = 'completed'
      `, vendorId);

            const recentOrders = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM "${tenantSchema}"."vendure_vendor_order"
        WHERE vendor_id = $1 AND created_at > NOW() - INTERVAL '7 days'
      `, vendorId);

            return {
                vendor,
                pendingPayout: Number((pendingPayout as any[])[0]?.total || 0),
                paidPayout: Number((paidPayout as any[])[0]?.total || 0),
                recentOrdersCount: Number((recentOrders as any[])[0]?.count || 0),
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Split order to vendors
     */
    async splitOrderToVendors(tenantSchema: string, orderId: number, orderLines: { productId: number; subtotal: number }[]): Promise<void> {
        for (const line of orderLines) {
            // Find vendor for this product
            const vendorProduct = await this.prisma.$queryRawUnsafe(`
        SELECT vp.vendor_id, v.commission_rate
        FROM "${tenantSchema}"."vendure_vendor_product" vp
        JOIN "${tenantSchema}"."vendure_vendor" v ON v.id = vp.vendor_id
        WHERE vp.product_id = $1
      `, line.productId);

            if ((vendorProduct as any[]).length > 0) {
                const vp = (vendorProduct as any[])[0];
                const commissionRate = Number(vp.commission_rate);
                const commission = Math.floor(line.subtotal * commissionRate / 100);
                const payout = line.subtotal - commission;

                await this.prisma.$executeRawUnsafe(`
          INSERT INTO "${tenantSchema}"."vendure_vendor_order" 
          (vendor_id, order_id, subtotal, commission, payout, status)
          VALUES ($1, $2, $3, $4, $5, 'pending')
        `, vp.vendor_id, orderId, line.subtotal, commission, payout);

                // Update vendor total sales
                await this.prisma.$executeRawUnsafe(`
          UPDATE "${tenantSchema}"."vendure_vendor"
          SET total_sales = total_sales + $1, updated_at = NOW()
          WHERE id = $2
        `, line.subtotal, vp.vendor_id);
            }
        }
    }

    /**
     * Request vendor payout
     */
    async requestPayout(tenantSchema: string, vendorId: number, amount: number, method: string): Promise<any> {
        const pending = await this.prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(payout), 0) as total
      FROM "${tenantSchema}"."vendure_vendor_order"
      WHERE vendor_id = $1 AND status = 'pending'
    `, vendorId);

        const pendingAmount = Number((pending as any[])[0]?.total || 0);
        if (amount > pendingAmount) {
            throw new Error('Insufficient balance');
        }

        const payout = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_vendor_payout" 
      (vendor_id, amount, method, status)
      VALUES ($1, $2, $3, 'processing')
      RETURNING *
    `, vendorId, amount, method);

        return {
            id: Number((payout as any[])[0].id),
            amount,
            method,
            status: 'processing',
        };
    }

    private serializeVendor(v: any): any {
        return {
            id: Number(v.id),
            userId: v.user_id ? Number(v.user_id) : null,
            name: v.name,
            slug: v.slug,
            email: v.email,
            phone: v.phone,
            description: v.description,
            logo: v.logo,
            commissionRate: Number(v.commission_rate),
            status: v.status,
            totalSales: Number(v.total_sales),
            totalProducts: Number(v.total_products),
            rating: Number(v.rating),
            approvedAt: v.approved_at,
            createdAt: v.created_at,
        };
    }
}
