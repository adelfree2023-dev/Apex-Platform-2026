/**
 * Analytics Service
 * Provides analytics and insights for tenants
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get overview stats for tenant
     */
    async getOverviewStats(tenantSchema: string): Promise<any> {
        try {
            // Product count
            const productCount = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_product"
      `);

            // Order count
            const orderCount = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_order"
      `);

            // Customer count
            const customerCount = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_customer"
      `);

            // Total revenue
            const revenue = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total), 0) as total FROM "${tenantSchema}"."vendure_order"
        WHERE state NOT IN ('Cancelled', 'Refunded')
      `);

            // Average order value
            const avgOrder = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(AVG(total), 0) as avg FROM "${tenantSchema}"."vendure_order"
        WHERE state NOT IN ('Cancelled', 'Refunded')
      `);

            return {
                products: parseInt((productCount as any[])[0]?.count || '0', 10),
                orders: parseInt((orderCount as any[])[0]?.count || '0', 10),
                customers: parseInt((customerCount as any[])[0]?.count || '0', 10),
                revenue: parseInt((revenue as any[])[0]?.total || '0', 10),
                avgOrderValue: parseInt((avgOrder as any[])[0]?.avg || '0', 10),
            };
        } catch (error) {
            this.logger.error(`Failed to get stats: ${error}`);
            return {
                products: 0,
                orders: 0,
                customers: 0,
                revenue: 0,
                avgOrderValue: 0,
            };
        }
    }

    /**
     * Get revenue by period (daily/weekly/monthly)
     */
    async getRevenueByPeriod(tenantSchema: string, period: 'day' | 'week' | 'month' = 'day', limit: number = 30): Promise<any[]> {
        try {
            let dateFormat: string;
            switch (period) {
                case 'week':
                    dateFormat = 'YYYY-IW';
                    break;
                case 'month':
                    dateFormat = 'YYYY-MM';
                    break;
                default:
                    dateFormat = 'YYYY-MM-DD';
            }

            const result = await this.prisma.$queryRawUnsafe(`
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as period,
          COUNT(*) as orders,
          COALESCE(SUM(total), 0) as revenue
        FROM "${tenantSchema}"."vendure_order"
        WHERE state NOT IN ('Cancelled', 'Refunded')
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY period DESC
        LIMIT $1
      `, limit);

            return (result as any[]).reverse();
        } catch (error) {
            return [];
        }
    }

    /**
     * Get order status breakdown
     */
    async getOrdersByStatus(tenantSchema: string): Promise<any[]> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT state, COUNT(*) as count
        FROM "${tenantSchema}"."vendure_order"
        GROUP BY state
        ORDER BY count DESC
      `);

            return result as any[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get top selling products
     */
    async getTopProducts(tenantSchema: string, limit: number = 10): Promise<any[]> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.name,
          COUNT(ol.id) as order_count,
          COALESCE(SUM(ol.quantity), 0) as total_sold,
          COALESCE(SUM(ol.unit_price * ol.quantity), 0) as total_revenue
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        LEFT JOIN "${tenantSchema}"."vendure_order_line" ol ON ol.product_variant_id = pv.id
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT $1
      `, limit);

            return result as any[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get recent orders
     */
    async getRecentOrders(tenantSchema: string, limit: number = 10): Promise<any[]> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT o.*, c.email as customer_email
        FROM "${tenantSchema}"."vendure_order" o
        LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = o.customer_id
        ORDER BY o.created_at DESC
        LIMIT $1
      `, limit);

            return result as any[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get customer acquisition over time
     */
    async getCustomerGrowth(tenantSchema: string, days: number = 30): Promise<any[]> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') as date,
          COUNT(*) as new_customers
        FROM "${tenantSchema}"."vendure_customer"
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date
      `);

            return result as any[];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get wallet/gift card stats
     */
    async getWalletStats(tenantSchema: string): Promise<any> {
        try {
            // Total wallet balance
            const walletBalance = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(balance), 0) as total
        FROM "${tenantSchema}"."vendure_wallet"
      `);

            // Active gift cards
            const giftCards = await this.prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(current_value), 0) as value
        FROM "${tenantSchema}"."vendure_gift_card"
        WHERE is_active = true AND redeemed_by IS NULL
      `);

            // Redeemed gift cards
            const redeemedCards = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM "${tenantSchema}"."vendure_gift_card"
        WHERE redeemed_by IS NOT NULL
      `);

            return {
                totalWalletBalance: parseInt((walletBalance as any[])[0]?.total || '0', 10),
                activeGiftCards: parseInt((giftCards as any[])[0]?.total || '0', 10),
                giftCardValue: parseInt((giftCards as any[])[0]?.value || '0', 10),
                redeemedGiftCards: parseInt((redeemedCards as any[])[0]?.count || '0', 10),
            };
        } catch (error) {
            return {
                totalWalletBalance: 0,
                activeGiftCards: 0,
                giftCardValue: 0,
                redeemedGiftCards: 0,
            };
        }
    }

    /**
     * Get conversion metrics
     */
    async getConversionMetrics(tenantSchema: string): Promise<any> {
        try {
            // Carts created
            const carts = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_cart"
      `);

            // Orders completed
            const orders = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_order"
        WHERE state NOT IN ('AddingItems', 'Cancelled')
      `);

            const cartCount = parseInt((carts as any[])[0]?.count || '0', 10);
            const orderCount = parseInt((orders as any[])[0]?.count || '0', 10);

            return {
                cartsCreated: cartCount,
                ordersCompleted: orderCount,
                conversionRate: cartCount > 0 ? ((orderCount / cartCount) * 100).toFixed(1) : 0,
            };
        } catch (error) {
            return {
                cartsCreated: 0,
                ordersCompleted: 0,
                conversionRate: 0,
            };
        }
    }
}
