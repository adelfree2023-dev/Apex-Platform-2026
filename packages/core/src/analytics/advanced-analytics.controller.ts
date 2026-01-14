/**
 * Advanced Analytics Controller
 * API endpoints for RFM, cohorts, trends, and performance metrics
 */

import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AdvancedAnalyticsService } from './advanced-analytics.service';

@Controller('api/shop')
export class AdvancedAnalyticsController {
    constructor(private readonly advancedAnalyticsService: AdvancedAnalyticsService) { }

    /**
     * Get RFM Customer Segmentation
     */
    @Get(':tenantId/advanced-analytics/rfm')
    async getRFMAnalysis(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getRFMAnalysis(tenantSchema);
            return {
                success: true,
                data,
                count: data.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get Customer Segment Summary
     */
    @Get(':tenantId/advanced-analytics/segments')
    async getSegmentSummary(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getSegmentSummary(tenantSchema);
            return {
                success: true,
                data,
            };
        } catch (error) {
            return { success: true, data: [] };
        }
    }

    /**
     * Get Sales Trends
     */
    @Get(':tenantId/advanced-analytics/trends')
    async getSalesTrends(
        @Param('tenantId') tenantId: string,
        @Query('period') period: 'day' | 'week' | 'month' = 'day',
        @Query('days') days: string = '30',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getSalesTrends(
                tenantSchema,
                period,
                parseInt(days, 10),
            );
            return {
                success: true,
                data,
                period,
            };
        } catch (error) {
            return { success: true, data: [], period };
        }
    }

    /**
     * Get Product Performance
     */
    @Get(':tenantId/advanced-analytics/products')
    async getProductPerformance(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getProductPerformance(tenantSchema);
            return {
                success: true,
                data,
                count: data.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get Customer Cohort Analysis
     */
    @Get(':tenantId/advanced-analytics/cohorts')
    async getCohortAnalysis(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getCohortAnalysis(tenantSchema);
            return {
                success: true,
                data,
            };
        } catch (error) {
            return { success: true, data: [] };
        }
    }

    /**
     * Get Revenue Metrics
     */
    @Get(':tenantId/advanced-analytics/revenue')
    async getRevenueMetrics(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getRevenueMetrics(tenantSchema);
            return {
                success: true,
                data,
            };
        } catch (error) {
            return { success: true, data: {} };
        }
    }

    /**
     * Get Abandonment Metrics
     */
    @Get(':tenantId/advanced-analytics/abandonment')
    async getAbandonmentMetrics(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const data = await this.advancedAnalyticsService.getAbandonmentMetrics(tenantSchema);
            return {
                success: true,
                data,
            };
        } catch (error) {
            return { success: true, data: {} };
        }
    }

    /**
     * Get Full Dashboard Data (all metrics in one call)
     */
    @Get(':tenantId/advanced-analytics/dashboard')
    async getDashboard(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const [revenue, segments, trends, products, abandonment] = await Promise.all([
                this.advancedAnalyticsService.getRevenueMetrics(tenantSchema),
                this.advancedAnalyticsService.getSegmentSummary(tenantSchema),
                this.advancedAnalyticsService.getSalesTrends(tenantSchema, 'day', 7),
                this.advancedAnalyticsService.getProductPerformance(tenantSchema),
                this.advancedAnalyticsService.getAbandonmentMetrics(tenantSchema),
            ]);

            return {
                success: true,
                data: {
                    revenue,
                    segments,
                    trends,
                    topProducts: products.slice(0, 5),
                    abandonment,
                },
            };
        } catch (error) {
            throw new HttpException(
                `Dashboard failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
