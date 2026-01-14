/**
 * RFQ Controller
 * API endpoints for RFQ and Wholesale
 */

import { Controller, Get, Post, Put, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { RfqService, RfqData } from './rfq.service';

@Controller('api/shop')
export class RfqController {
    constructor(private readonly rfqService: RfqService) { }

    /**
     * Migrate RFQ tables
     */
    @Post(':tenantId/migrate-rfq')
    async migrateRfq(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.rfqService.createRfqTables(tenantSchema);
            return {
                success: true,
                message: 'RFQ and wholesale tables created with default tiers',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== RFQ ENDPOINTS ====================

    /**
     * Create RFQ request
     */
    @Post(':tenantId/rfq')
    async createRfq(
        @Param('tenantId') tenantId: string,
        @Body() body: RfqData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.customerName || !body.customerEmail || !body.items || body.items.length === 0) {
            throw new HttpException(
                'Customer name, email, and at least one item are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const rfq = await this.rfqService.createRfq(tenantSchema, body);
            return {
                success: true,
                data: rfq,
                message: 'RFQ submitted successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create RFQ: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get all RFQs (admin)
     */
    @Get(':tenantId/rfq')
    async getRfqs(
        @Param('tenantId') tenantId: string,
        @Query('status') status?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const rfqs = await this.rfqService.getRfqs(tenantSchema, status);
            return {
                success: true,
                data: rfqs,
                count: rfqs.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get single RFQ
     */
    @Get(':tenantId/rfq/:rfqId')
    async getRfq(
        @Param('tenantId') tenantId: string,
        @Param('rfqId') rfqId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const rfq = await this.rfqService.getRfq(tenantSchema, parseInt(rfqId, 10));
            return {
                success: true,
                data: rfq,
                found: !!rfq,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Update RFQ (admin)
     */
    @Put(':tenantId/rfq/:rfqId')
    async updateRfq(
        @Param('tenantId') tenantId: string,
        @Param('rfqId') rfqId: string,
        @Body() body: any,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const rfq = await this.rfqService.updateRfq(tenantSchema, parseInt(rfqId, 10), body);
            return {
                success: true,
                data: rfq,
                message: 'RFQ updated',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to update RFQ: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== WHOLESALE ENDPOINTS ====================

    /**
     * Get wholesale tiers
     */
    @Get(':tenantId/wholesale/tiers')
    async getWholesaleTiers(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const tiers = await this.rfqService.getWholesaleTiers(tenantSchema);
            return {
                success: true,
                data: tiers,
            };
        } catch (error) {
            return { success: true, data: [] };
        }
    }

    /**
     * Get wholesale price
     */
    @Get(':tenantId/wholesale/price')
    async getWholesalePrice(
        @Param('tenantId') tenantId: string,
        @Query('customerId') customerId: string,
        @Query('price') price: string,
        @Query('quantity') quantity: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const result = await this.rfqService.getWholesalePrice(
                tenantSchema,
                parseInt(customerId, 10),
                parseInt(price, 10),
                parseInt(quantity, 10),
            );
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return { success: true, data: { originalPrice: parseInt(price, 10), discountedPrice: parseInt(price, 10), discount: 0, tier: null } };
        }
    }

    /**
     * Apply for wholesale account
     */
    @Post(':tenantId/wholesale/apply')
    async applyForWholesale(
        @Param('tenantId') tenantId: string,
        @Body() body: { customerId: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.customerId) {
            throw new HttpException('Customer ID is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.rfqService.applyForWholesale(tenantSchema, body.customerId);
            return {
                success: true,
                data: result,
                message: 'Wholesale application submitted',
            };
        } catch (error) {
            throw new HttpException(
                `Application failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
