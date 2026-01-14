/**
 * Affiliate Controller
 * API endpoints for affiliate marketing
 */

import { Controller, Get, Post, Put, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AffiliateService, AffiliateData } from './affiliate.service';

@Controller('api/shop')
export class AffiliateController {
    constructor(private readonly affiliateService: AffiliateService) { }

    /**
     * Migrate affiliate tables
     */
    @Post(':tenantId/migrate-affiliates')
    async migrateAffiliates(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.affiliateService.createAffiliateTables(tenantSchema);
            return {
                success: true,
                message: 'Affiliate tables created',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Apply to become affiliate
     */
    @Post(':tenantId/affiliates/apply')
    async applyAffiliate(
        @Param('tenantId') tenantId: string,
        @Body() body: AffiliateData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.email) {
            throw new HttpException('Name and email are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const affiliate = await this.affiliateService.applyAffiliate(tenantSchema, body);
            return {
                success: true,
                data: affiliate,
                message: 'Application submitted! We will review within 24-48 hours.',
            };
        } catch (error) {
            throw new HttpException(
                `Application failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get all affiliates (admin)
     */
    @Get(':tenantId/affiliates')
    async getAffiliates(
        @Param('tenantId') tenantId: string,
        @Query('status') status?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const affiliates = await this.affiliateService.getAffiliates(tenantSchema, status);
            return {
                success: true,
                data: affiliates,
                count: affiliates.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get affiliate by ID
     */
    @Get(':tenantId/affiliates/:affiliateId')
    async getAffiliate(
        @Param('tenantId') tenantId: string,
        @Param('affiliateId') affiliateId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const affiliate = await this.affiliateService.getAffiliate(
                tenantSchema,
                parseInt(affiliateId, 10),
            );
            return {
                success: true,
                data: affiliate,
                found: !!affiliate,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Approve affiliate (admin)
     */
    @Put(':tenantId/affiliates/:affiliateId/approve')
    async approveAffiliate(
        @Param('tenantId') tenantId: string,
        @Param('affiliateId') affiliateId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const affiliate = await this.affiliateService.approveAffiliate(
                tenantSchema,
                parseInt(affiliateId, 10),
            );
            return {
                success: true,
                data: affiliate,
                message: 'Affiliate approved',
            };
        } catch (error) {
            throw new HttpException(
                `Approval failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Track referral
     */
    @Post(':tenantId/affiliates/track')
    async trackReferral(
        @Param('tenantId') tenantId: string,
        @Body() body: { affiliateCode: string; orderId: number; orderTotal: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const result = await this.affiliateService.trackReferral(
                tenantSchema,
                body.affiliateCode,
                body.orderId,
                body.orderTotal,
            );
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return { success: false, message: String(error) };
        }
    }

    /**
     * Get affiliate referrals
     */
    @Get(':tenantId/affiliates/:affiliateId/referrals')
    async getReferrals(
        @Param('tenantId') tenantId: string,
        @Param('affiliateId') affiliateId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const referrals = await this.affiliateService.getReferrals(
                tenantSchema,
                parseInt(affiliateId, 10),
            );
            return {
                success: true,
                data: referrals,
                count: referrals.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get affiliate dashboard
     */
    @Get(':tenantId/affiliates/:affiliateId/dashboard')
    async getAffiliateDashboard(
        @Param('tenantId') tenantId: string,
        @Param('affiliateId') affiliateId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const stats = await this.affiliateService.getAffiliateStats(
                tenantSchema,
                parseInt(affiliateId, 10),
            );
            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            return { success: true, data: null };
        }
    }

    /**
     * Request payout
     */
    @Post(':tenantId/affiliates/:affiliateId/payout')
    async requestPayout(
        @Param('tenantId') tenantId: string,
        @Param('affiliateId') affiliateId: string,
        @Body() body: { amount: number; method: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.amount || !body.method) {
            throw new HttpException('Amount and method are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const payout = await this.affiliateService.requestPayout(
                tenantSchema,
                parseInt(affiliateId, 10),
                body.amount,
                body.method,
            );
            return {
                success: true,
                data: payout,
                message: 'Payout request submitted',
            };
        } catch (error) {
            throw new HttpException(
                `Payout failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
