/**
 * Subscription Controller
 * API endpoints for subscription management
 */

import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionService, SubscriptionPlanData } from './subscription.service';

@Controller('api/shop')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    /**
     * Migrate subscription tables
     */
    @Post(':tenantId/migrate-subscriptions')
    async migrateSubscriptions(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.subscriptionService.createSubscriptionTables(tenantSchema);
            return {
                success: true,
                message: 'Subscription tables created with default plans',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== PLANS ====================

    /**
     * Get all plans
     */
    @Get(':tenantId/subscriptions/plans')
    async getPlans(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const plans = await this.subscriptionService.getPlans(tenantSchema);
            return {
                success: true,
                data: plans,
                count: plans.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Create plan
     */
    @Post(':tenantId/subscriptions/plans')
    async createPlan(
        @Param('tenantId') tenantId: string,
        @Body() body: SubscriptionPlanData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.price || !body.interval) {
            throw new HttpException('Name, price, and interval are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const plan = await this.subscriptionService.createPlan(tenantSchema, body);
            return {
                success: true,
                data: plan,
                message: 'Plan created',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create plan: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== SUBSCRIPTIONS ====================

    /**
     * Subscribe customer to plan
     */
    @Post(':tenantId/subscriptions')
    async subscribe(
        @Param('tenantId') tenantId: string,
        @Body() body: { customerId: number; planId: number; paymentMethod?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.customerId || !body.planId) {
            throw new HttpException('Customer ID and Plan ID are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const subscription = await this.subscriptionService.subscribe(
                tenantSchema,
                body.customerId,
                body.planId,
                body.paymentMethod,
            );
            return {
                success: true,
                data: subscription,
                message: 'Subscribed successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Subscription failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get customer subscriptions
     */
    @Get(':tenantId/customers/:customerId/subscriptions')
    async getCustomerSubscriptions(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const subscriptions = await this.subscriptionService.getCustomerSubscriptions(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: subscriptions,
                count: subscriptions.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get subscription details
     */
    @Get(':tenantId/subscriptions/:subscriptionId')
    async getSubscription(
        @Param('tenantId') tenantId: string,
        @Param('subscriptionId') subscriptionId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const subscription = await this.subscriptionService.getSubscription(
                tenantSchema,
                parseInt(subscriptionId, 10),
            );
            return {
                success: true,
                data: subscription,
                found: !!subscription,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Cancel subscription
     */
    @Delete(':tenantId/subscriptions/:subscriptionId')
    async cancelSubscription(
        @Param('tenantId') tenantId: string,
        @Param('subscriptionId') subscriptionId: string,
        @Query('immediately') immediately?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const subscription = await this.subscriptionService.cancelSubscription(
                tenantSchema,
                parseInt(subscriptionId, 10),
                immediately === 'true',
            );
            return {
                success: true,
                data: subscription,
                message: immediately === 'true' ? 'Subscription cancelled' : 'Will cancel at period end',
            };
        } catch (error) {
            throw new HttpException(
                `Cancellation failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Renew subscription
     */
    @Post(':tenantId/subscriptions/:subscriptionId/renew')
    async renewSubscription(
        @Param('tenantId') tenantId: string,
        @Param('subscriptionId') subscriptionId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const subscription = await this.subscriptionService.renewSubscription(
                tenantSchema,
                parseInt(subscriptionId, 10),
            );
            return {
                success: true,
                data: subscription,
                message: 'Subscription renewed',
            };
        } catch (error) {
            throw new HttpException(
                `Renewal failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get payment history
     */
    @Get(':tenantId/subscriptions/:subscriptionId/payments')
    async getPaymentHistory(
        @Param('tenantId') tenantId: string,
        @Param('subscriptionId') subscriptionId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const payments = await this.subscriptionService.getPaymentHistory(
                tenantSchema,
                parseInt(subscriptionId, 10),
            );
            return {
                success: true,
                data: payments,
                count: payments.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }
}
