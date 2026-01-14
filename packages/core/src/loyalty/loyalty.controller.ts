/**
 * Loyalty Controller
 * API endpoints for loyalty program
 */

import { Controller, Get, Post, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { LoyaltyService, RewardData } from './loyalty.service';

@Controller('api/shop')
export class LoyaltyController {
    constructor(private readonly loyaltyService: LoyaltyService) { }

    /**
     * Migrate loyalty tables
     */
    @Post(':tenantId/migrate-loyalty')
    async migrateLoyalty(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.loyaltyService.createLoyaltyTables(tenantSchema);
            return {
                success: true,
                message: 'Loyalty tables created with default rewards',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get customer loyalty account
     */
    @Get(':tenantId/customers/:customerId/loyalty')
    async getAccount(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const account = await this.loyaltyService.getOrCreateAccount(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: account,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get account: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Add points to customer
     */
    @Post(':tenantId/customers/:customerId/loyalty/add-points')
    async addPoints(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Body() body: { points: number; type?: string; description?: string; orderId?: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.points || body.points <= 0) {
            throw new HttpException('Points must be positive', HttpStatus.BAD_REQUEST);
        }

        try {
            const account = await this.loyaltyService.addPoints(
                tenantSchema,
                parseInt(customerId, 10),
                body.points,
                body.type || 'manual',
                body.description,
                body.orderId,
            );
            return {
                success: true,
                data: account,
                message: `Added ${body.points} points`,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to add points: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get available rewards
     */
    @Get(':tenantId/loyalty/rewards')
    async getRewards(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const rewards = await this.loyaltyService.getRewards(tenantSchema);
            return {
                success: true,
                data: rewards,
                count: rewards.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Redeem reward
     */
    @Post(':tenantId/customers/:customerId/loyalty/redeem')
    async redeemReward(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
        @Body() body: { rewardId: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.rewardId) {
            throw new HttpException('Reward ID is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.loyaltyService.redeemReward(
                tenantSchema,
                parseInt(customerId, 10),
                body.rewardId,
            );
            return {
                success: true,
                data: result,
                message: `Reward redeemed! Use code: ${result.code}`,
            };
        } catch (error) {
            throw new HttpException(
                `Redemption failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get transaction history
     */
    @Get(':tenantId/customers/:customerId/loyalty/transactions')
    async getTransactions(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const transactions = await this.loyaltyService.getTransactions(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: transactions,
                count: transactions.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get customer redemptions
     */
    @Get(':tenantId/customers/:customerId/loyalty/redemptions')
    async getRedemptions(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const redemptions = await this.loyaltyService.getRedemptions(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: redemptions,
                count: redemptions.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }
}
