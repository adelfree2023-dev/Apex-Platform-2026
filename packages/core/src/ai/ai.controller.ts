/**
 * AI Commerce Controller
 * API endpoints for recommendations and insights
 */

import { Controller, Get, Post, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('api/shop')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    /**
     * Migrate AI tables
     */
    @Post(':tenantId/migrate-ai')
    async migrateAi(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.aiService.createAiTables(tenantSchema);
            return {
                success: true,
                message: 'AI tables created',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Track behavior
     */
    @Post(':tenantId/ai/track')
    async trackBehavior(
        @Param('tenantId') tenantId: string,
        @Body() body: { customerId?: number; sessionId: string; productId: number; action: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.aiService.trackBehavior(
                tenantSchema,
                body.customerId || null,
                body.sessionId,
                body.productId,
                body.action as any,
            );
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Get similar products
     */
    @Get(':tenantId/products/:productId/similar')
    async getSimilarProducts(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
        @Query('limit') limit?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.aiService.getSimilarProducts(
                tenantSchema,
                parseInt(productId, 10),
                limit ? parseInt(limit, 10) : 6,
            );
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get frequently bought together
     */
    @Get(':tenantId/products/:productId/bought-together')
    async getFrequentlyBoughtTogether(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
        @Query('limit') limit?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.aiService.getFrequentlyBoughtTogether(
                tenantSchema,
                parseInt(productId, 10),
                limit ? parseInt(limit, 10) : 4,
            );
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get personalized recommendations
     */
    @Get(':tenantId/customers/:customerId/recommendations')
    async getPersonalizedRecommendations(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Query('limit') limit?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.aiService.getPersonalizedRecommendations(
                tenantSchema,
                parseInt(customerId, 10),
                limit ? parseInt(limit, 10) : 8,
            );
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get trending products
     */
    @Get(':tenantId/ai/trending')
    async getTrendingProducts(
        @Param('tenantId') tenantId: string,
        @Query('limit') limit?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const products = await this.aiService.getTrendingProducts(
                tenantSchema,
                limit ? parseInt(limit, 10) : 8,
            );
            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get AI insights
     */
    @Get(':tenantId/ai/insights')
    async getInsights(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const insights = await this.aiService.generateInsights(tenantSchema);
            return {
                success: true,
                data: insights,
                count: insights.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }
}
