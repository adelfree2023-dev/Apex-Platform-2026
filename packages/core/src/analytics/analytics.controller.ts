/**
 * Analytics Controller
 * API endpoints for analytics and insights
 */

import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('api/shop')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    /**
     * Get overview stats
     */
    @Get(':tenantId/analytics')
    async getOverviewStats(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const stats = await this.analyticsService.getOverviewStats(tenantSchema);
            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get analytics: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get revenue by period
     */
    @Get(':tenantId/analytics/revenue')
    async getRevenueByPeriod(
        @Param('tenantId') tenantId: string,
        @Query('period') period: 'day' | 'week' | 'month' = 'day',
        @Query('limit') limit: string = '30',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getRevenueByPeriod(
                tenantSchema,
                period,
                parseInt(limit, 10),
            );
            return {
                success: true,
                data,
                period,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get revenue: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get orders by status
     */
    @Get(':tenantId/analytics/orders-by-status')
    async getOrdersByStatus(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getOrdersByStatus(tenantSchema);
            return {
                success: true,
                data: data || [],
            };
        } catch (error) {
            // Return empty array instead of error for graceful degradation
            return {
                success: true,
                data: [],
                warning: 'Could not fetch order status breakdown',
            };
        }
    }

    /**
     * Get top products
     */
    @Get(':tenantId/analytics/top-products')
    async getTopProducts(
        @Param('tenantId') tenantId: string,
        @Query('limit') limit: string = '10',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getTopProducts(
                tenantSchema,
                parseInt(limit, 10),
            );
            return {
                success: true,
                data,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get top products: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get recent orders
     */
    @Get(':tenantId/analytics/recent-orders')
    async getRecentOrders(
        @Param('tenantId') tenantId: string,
        @Query('limit') limit: string = '10',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getRecentOrders(
                tenantSchema,
                parseInt(limit, 10),
            );
            return {
                success: true,
                data,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get recent orders: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get customer growth
     */
    @Get(':tenantId/analytics/customer-growth')
    async getCustomerGrowth(
        @Param('tenantId') tenantId: string,
        @Query('days') days: string = '30',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getCustomerGrowth(
                tenantSchema,
                parseInt(days, 10),
            );
            return {
                success: true,
                data,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get customer growth: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get wallet stats
     */
    @Get(':tenantId/analytics/wallet')
    async getWalletStats(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getWalletStats(tenantSchema);
            return {
                success: true,
                data,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get wallet stats: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get conversion metrics
     */
    @Get(':tenantId/analytics/conversion')
    async getConversionMetrics(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.analyticsService.getConversionMetrics(tenantSchema);
            return {
                success: true,
                data,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get conversion metrics: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
