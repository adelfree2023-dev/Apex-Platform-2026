/**
 * Advanced Analytics Service
 * Provides RFM analysis, cohorts, trends, and customer segmentation
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RFMScore {
    customerId: number;
    email: string;
    recency: number;  // Days since last order
    frequency: number; // Number of orders
    monetary: number;  // Total spent
    rScore: number;    // 1-5
    fScore: number;    // 1-5
    mScore: number;    // 1-5
    segment: string;   // Champion, Loyal, etc.
}

@Injectable()
export class AdvancedAnalyticsService {
    private readonly logger = new Logger(AdvancedAnalyticsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * RFM Customer Segmentation
     */
    async getRFMAnalysis(tenantSchema: string): Promise<RFMScore[]> {
        try {
            // Get customer order data
            const customers = await this.prisma.$queryRawUnsafe(`
        SELECT 
          c.id as customer_id,
          c.email,
          EXTRACT(DAY FROM NOW() - MAX(o.created_at)) as days_since_last_order,
          COUNT(o.id) as order_count,
          COALESCE(SUM(o.total), 0) as total_spent
        FROM "${tenantSchema}"."vendure_customer" c
        LEFT JOIN "${tenantSchema}"."vendure_order" o ON o.customer_id = c.id
        WHERE o.state NOT IN ('Cancelled', 'Refunded') OR o.state IS NULL
        GROUP BY c.id, c.email
        ORDER BY total_spent DESC
      `);

            const customerData = customers as any[];

            // Calculate RFM scores
            const rfmResults: RFMScore[] = customerData.map(c => {
                const recency = Number(c.days_since_last_order) || 999;
                const frequency = Number(c.order_count) || 0;
                const monetary = Number(c.total_spent) || 0;

                // Score 1-5 (5 is best)
                const rScore = recency <= 30 ? 5 : recency <= 60 ? 4 : recency <= 90 ? 3 : recency <= 180 ? 2 : 1;
                const fScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
                const mScore = monetary >= 500000 ? 5 : monetary >= 200000 ? 4 : monetary >= 100000 ? 3 : monetary >= 50000 ? 2 : 1;

                // Determine segment
                const avgScore = (rScore + fScore + mScore) / 3;
                let segment = 'New';
                if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'Champion';
                else if (rScore >= 3 && fScore >= 4) segment = 'Loyal Customer';
                else if (rScore >= 4 && fScore <= 2) segment = 'Recent Customer';
                else if (rScore <= 2 && fScore >= 4) segment = 'At Risk';
                else if (rScore <= 2 && fScore <= 2 && mScore >= 3) segment = 'Cant Lose';
                else if (rScore <= 2 && fScore <= 2) segment = 'Lost';
                else if (avgScore >= 3) segment = 'Potential Loyalist';

                return {
                    customerId: Number(c.customer_id),
                    email: c.email,
                    recency,
                    frequency,
                    monetary,
                    rScore,
                    fScore,
                    mScore,
                    segment,
                };
            });

            return rfmResults;
        } catch (error) {
            this.logger.error(`RFM analysis failed: ${error}`);
            return [];
        }
    }

    /**
     * Customer Segment Summary
     */
    async getSegmentSummary(tenantSchema: string): Promise<any[]> {
        const rfm = await this.getRFMAnalysis(tenantSchema);

        const segments: Record<string, { count: number; revenue: number }> = {};
        rfm.forEach(r => {
            if (!segments[r.segment]) {
                segments[r.segment] = { count: 0, revenue: 0 };
            }
            segments[r.segment].count++;
            segments[r.segment].revenue += r.monetary;
        });

        return Object.entries(segments).map(([segment, data]) => ({
            segment,
            count: data.count,
            revenue: data.revenue,
            percentage: rfm.length > 0 ? ((data.count / rfm.length) * 100).toFixed(1) : 0,
        }));
    }

    /**
     * Sales Trends (daily/weekly/monthly)
     */
    async getSalesTrends(tenantSchema: string, period: 'day' | 'week' | 'month' = 'day', days: number = 30): Promise<any[]> {
        try {
            let dateFormat: string;
            switch (period) {
                case 'week':
                    dateFormat = 'IYYY-IW';
                    break;
                case 'month':
                    dateFormat = 'YYYY-MM';
                    break;
                default:
                    dateFormat = 'YYYY-MM-DD';
            }

            const result = await this.prisma.$queryRawUnsafe(`
        SELECT 
          TO_CHAR(o.created_at, '${dateFormat}') as period,
          COUNT(o.id) as orders,
          COALESCE(SUM(o.total), 0) as revenue,
          COUNT(DISTINCT o.customer_id) as unique_customers,
          COALESCE(AVG(o.total), 0) as avg_order_value
        FROM "${tenantSchema}"."vendure_order" o
        WHERE o.created_at >= NOW() - INTERVAL '${days} days'
          AND o.state NOT IN ('Cancelled', 'Refunded')
        GROUP BY TO_CHAR(o.created_at, '${dateFormat}')
        ORDER BY period DESC
        LIMIT 60
      `);

            return (result as any[]).reverse().map(r => ({
                period: r.period,
                orders: Number(r.orders),
                revenue: Number(r.revenue),
                uniqueCustomers: Number(r.unique_customers),
                avgOrderValue: Number(r.avg_order_value),
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Product Performance
     */
    async getProductPerformance(tenantSchema: string): Promise<any[]> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.name,
          pv.sku,
          pv.price,
          pv.stock_on_hand,
          COUNT(DISTINCT ol.id) as order_count,
          COALESCE(SUM(ol.quantity), 0) as units_sold,
          COALESCE(SUM(ol.quantity * ol.unit_price), 0) as total_revenue,
          COUNT(DISTINCT r.id) as review_count,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        LEFT JOIN "${tenantSchema}"."vendure_order_line" ol ON ol.product_variant_id = pv.id
        LEFT JOIN "${tenantSchema}"."vendure_review" r ON r.product_id = p.id
        WHERE p.enabled = true OR p.enabled IS NULL
        GROUP BY p.id, p.name, pv.sku, pv.price, pv.stock_on_hand
        ORDER BY total_revenue DESC
        LIMIT 20
      `);

            return (result as any[]).map(p => ({
                id: Number(p.id),
                name: p.name,
                sku: p.sku,
                price: Number(p.price),
                stockOnHand: Number(p.stock_on_hand),
                orderCount: Number(p.order_count),
                unitsSold: Number(p.units_sold),
                totalRevenue: Number(p.total_revenue),
                reviewCount: Number(p.review_count),
                avgRating: parseFloat(p.avg_rating) || 0,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Customer Cohort Analysis
     */
    async getCohortAnalysis(tenantSchema: string): Promise<any[]> {
        try {
            // Group customers by signup month
            const cohorts = await this.prisma.$queryRawUnsafe(`
        WITH customer_cohort AS (
          SELECT 
            c.id as customer_id,
            TO_CHAR(c.created_at, 'YYYY-MM') as cohort_month,
            c.created_at as signup_date
          FROM "${tenantSchema}"."vendure_customer" c
        ),
        customer_orders AS (
          SELECT 
            cc.customer_id,
            cc.cohort_month,
            TO_CHAR(o.created_at, 'YYYY-MM') as order_month,
            EXTRACT(MONTH FROM AGE(o.created_at, cc.signup_date)) as months_since_signup
          FROM customer_cohort cc
          JOIN "${tenantSchema}"."vendure_order" o ON o.customer_id = cc.customer_id
          WHERE o.state NOT IN ('Cancelled', 'Refunded')
        )
        SELECT 
          cohort_month,
          months_since_signup,
          COUNT(DISTINCT customer_id) as customer_count
        FROM customer_orders
        WHERE months_since_signup <= 12
        GROUP BY cohort_month, months_since_signup
        ORDER BY cohort_month, months_since_signup
      `);

            return (cohorts as any[]).map(c => ({
                cohortMonth: c.cohort_month,
                monthsSinceSignup: Number(c.months_since_signup),
                customerCount: Number(c.customer_count),
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Revenue Metrics
     */
    async getRevenueMetrics(tenantSchema: string): Promise<any> {
        try {
            // Today's revenue
            const today = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
        FROM "${tenantSchema}"."vendure_order"
        WHERE DATE(created_at) = CURRENT_DATE AND state NOT IN ('Cancelled', 'Refunded')
      `);

            // This week
            const thisWeek = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
        FROM "${tenantSchema}"."vendure_order"
        WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE) AND state NOT IN ('Cancelled', 'Refunded')
      `);

            // This month
            const thisMonth = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
        FROM "${tenantSchema}"."vendure_order"
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND state NOT IN ('Cancelled', 'Refunded')
      `);

            // Last month (for comparison)
            const lastMonth = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
        FROM "${tenantSchema}"."vendure_order"
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < DATE_TRUNC('month', CURRENT_DATE)
          AND state NOT IN ('Cancelled', 'Refunded')
      `);

            const thisMonthRevenue = Number((thisMonth as any[])[0]?.revenue || 0);
            const lastMonthRevenue = Number((lastMonth as any[])[0]?.revenue || 0);
            const growthRate = lastMonthRevenue > 0
                ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
                : 0;

            return {
                today: {
                    revenue: Number((today as any[])[0]?.revenue || 0),
                    orders: Number((today as any[])[0]?.orders || 0),
                },
                thisWeek: {
                    revenue: Number((thisWeek as any[])[0]?.revenue || 0),
                    orders: Number((thisWeek as any[])[0]?.orders || 0),
                },
                thisMonth: {
                    revenue: thisMonthRevenue,
                    orders: Number((thisMonth as any[])[0]?.orders || 0),
                },
                lastMonth: {
                    revenue: lastMonthRevenue,
                    orders: Number((lastMonth as any[])[0]?.orders || 0),
                },
                monthOverMonthGrowth: growthRate,
            };
        } catch (error) {
            return {
                today: { revenue: 0, orders: 0 },
                thisWeek: { revenue: 0, orders: 0 },
                thisMonth: { revenue: 0, orders: 0 },
                lastMonth: { revenue: 0, orders: 0 },
                monthOverMonthGrowth: 0,
            };
        }
    }

    /**
     * Abandonment Rate
     */
    async getAbandonmentMetrics(tenantSchema: string): Promise<any> {
        try {
            // Carts with items but no order
            const abandonedCarts = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(DISTINCT c.id) as count
        FROM "${tenantSchema}"."vendure_cart" c
        LEFT JOIN "${tenantSchema}"."vendure_order" o ON o.session_id = c.session_id
        WHERE o.id IS NULL
          AND c.created_at >= NOW() - INTERVAL '30 days'
      `);

            // Total carts
            const totalCarts = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_cart"
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

            // Completed orders
            const completedOrders = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_order"
        WHERE state NOT IN ('Cancelled', 'AddingItems') AND created_at >= NOW() - INTERVAL '30 days'
      `);

            const total = Number((totalCarts as any[])[0]?.count || 0);
            const abandoned = Number((abandonedCarts as any[])[0]?.count || 0);
            const completed = Number((completedOrders as any[])[0]?.count || 0);

            return {
                totalCarts: total,
                abandonedCarts: abandoned,
                completedOrders: completed,
                abandonmentRate: total > 0 ? ((abandoned / total) * 100).toFixed(1) : 0,
                conversionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
            };
        } catch (error) {
            return {
                totalCarts: 0,
                abandonedCarts: 0,
                completedOrders: 0,
                abandonmentRate: 0,
                conversionRate: 0,
            };
        }
    }
}
