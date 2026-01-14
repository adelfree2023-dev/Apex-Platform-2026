/**
 * Payments Controller
 * API endpoints for Stripe payment processing
 */

import { Controller, Post, Get, Body, Param, Req, RawBodyRequest, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService, CreatePaymentIntentInput } from './payments.service';

@Controller('api/shop')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    /**
     * Create payment intent for an order
     */
    @Post(':tenantId/payments/create-intent')
    async createPaymentIntent(
        @Param('tenantId') tenantId: string,
        @Body() body: CreatePaymentIntentInput,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.orderId) {
            throw new HttpException('Missing orderId', HttpStatus.BAD_REQUEST);
        }

        try {
            const paymentIntent = await this.paymentsService.createPaymentIntent(
                tenantSchema,
                tenantId,
                body,
            );

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create payment intent: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get payment status
     */
    @Get(':tenantId/payments/:paymentIntentId')
    async getPaymentStatus(
        @Param('tenantId') tenantId: string,
        @Param('paymentIntentId') paymentIntentId: string,
    ) {
        try {
            const paymentIntent = await this.paymentsService.getPaymentStatus(paymentIntentId);
            return {
                success: true,
                status: paymentIntent.status,
                amount: paymentIntent.amount,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get payment status: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

/**
 * Stripe Webhook Controller
 * Handles Stripe webhook events
 */
@Controller('api/webhooks')
export class StripeWebhookController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('stripe')
    async handleWebhook(@Req() req: RawBodyRequest<Request>) {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
            throw new HttpException('Missing stripe-signature header', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.paymentsService.handleWebhook(
                req.rawBody as Buffer,
                signature,
            );
            return result;
        } catch (error) {
            throw new HttpException(
                `Webhook error: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
