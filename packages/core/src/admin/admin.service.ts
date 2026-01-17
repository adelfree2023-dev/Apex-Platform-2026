/**
 * Admin Service
 * Provides admin-level operations for tenant management and analytics
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all tenants
     */
    async getTenants(): Promise<any[]> {
        const tenants = await this.prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return tenants;
    }

    /**
     * Validate tenant exists
     */
    private async validateTenant(tenantId: string): Promise<void> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant not found: ${tenantId}`);
        }
    }

    /**
     * Get tenant by ID
     */
    async getTenant(id: string): Promise<any> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
        });

        if (!tenant) {
            throw new NotFoundException(`Tenant not found: ${id}`);
        }

        return tenant;
    }

    /**
     * Get tenant stats (orders, products, revenue)
     */
    async getTenantStats(tenantId: string): Promise<any> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            // Get product count
            const productCount = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_product"
      `);

            // Get order count and revenue
            const orderStats = await this.prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as order_count,
          COALESCE(SUM(total), 0) as total_revenue
        FROM "${tenantSchema}"."vendure_order"
      `);

            // Get customer count
            const customerCount = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_customer"
      `);

            return {
                products: parseInt((productCount as any[])[0]?.count || '0', 10),
                orders: parseInt((orderStats as any[])[0]?.order_count || '0', 10),
                revenue: parseInt((orderStats as any[])[0]?.total_revenue || '0', 10),
                customers: parseInt((customerCount as any[])[0]?.count || '0', 10),
            };
        } catch (error) {
            this.logger.warn(`Failed to get stats for tenant ${tenantId}: ${error}`);
            return {
                products: 0,
                orders: 0,
                revenue: 0,
                customers: 0,
            };
        }
    }

    /**
     * Get recent orders for tenant
     */
    async getRecentOrders(tenantId: string, limit: number = 10): Promise<any[]> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const orders = await this.prisma.$queryRawUnsafe(`
        SELECT o.*, c.email as customer_email
        FROM "${tenantSchema}"."vendure_order" o
        LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = o.customer_id
        ORDER BY o.created_at DESC
        LIMIT $1
      `, limit);

            return orders as any[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get top products for tenant
     */
    async getTopProducts(tenantId: string, limit: number = 10): Promise<any[]> {
        await this.validateTenant(tenantId);
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.prisma.$queryRawUnsafe(`
        SELECT p.*, pv.price, pv.stock_on_hand,
          (SELECT COUNT(*) FROM "${tenantSchema}"."vendure_order_line" ol WHERE ol.product_variant_id = pv.id) as order_count
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        ORDER BY order_count DESC
        LIMIT $1
      `, limit);

            return products as any[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Update tenant
     */
    async updateTenant(id: string, data: { name?: string; territory?: string; businessType?: string }): Promise<any> {
        const tenant = await this.prisma.tenant.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
        return tenant;
    }

    /**
     * Get platform-wide stats
     */
    async getPlatformStats(): Promise<any> {
        const tenantCount = await this.prisma.tenant.count();
        const tenants = await this.prisma.tenant.findMany();

        let totalProducts = 0;
        let totalOrders = 0;
        let totalRevenue = 0;
        let totalCustomers = 0;

        for (const tenant of tenants) {
            const stats = await this.getTenantStats(tenant.id);
            totalProducts += stats.products;
            totalOrders += stats.orders;
            totalRevenue += stats.revenue;
            totalCustomers += stats.customers;
        }

        return {
            tenants: tenantCount,
            products: totalProducts,
            orders: totalOrders,
            revenue: totalRevenue,
            customers: totalCustomers,
        };
    }
}
