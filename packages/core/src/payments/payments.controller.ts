/**
 * Payments Controller
 * API endpoints for multi-channel payment processing
 */

import { Controller, Post, Get, Body, Param, Req, RawBodyRequest, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService, CreatePaymentIntentInput } from './payments.service';
import { PaymentGatewayService, ProcessPaymentInput, PaymentMethod } from './payment-gateway.service';

@Controller('api/shop')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly paymentGatewayService: PaymentGatewayService,
    ) { }

    /**
     * Get supported payment methods
     */
    @Get(':tenantId/payments/methods')
    async getSupportedMethods(@Param('tenantId') tenantId: string) {
        return {
            success: true,
            methods: this.paymentGatewayService.getSupportedMethods(),
            currency: 'egp',
        };
    }

    /**
     * Process payment with any method
     */
    @Post(':tenantId/payments/process')
    async processPayment(
        @Param('tenantId') tenantId: string,
        @Body() body: { orderId: number; method: PaymentMethod; customerEmail?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.orderId || !body.method) {
            throw new HttpException('Missing orderId or method', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.paymentGatewayService.processPayment(
                tenantSchema,
                tenantId,
                {
                    orderId: body.orderId,
                    method: body.method,
                    customerEmail: body.customerEmail,
                },
            );

            return {
                success: true,
                ...result,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to process payment: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Confirm payment (for COD or manual confirmation)
     */
    @Post(':tenantId/payments/confirm')
    async confirmPayment(
        @Param('tenantId') tenantId: string,
        @Body() body: { orderId: number },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const result = await this.paymentGatewayService.confirmPayment(
                tenantSchema,
                tenantId,
                body.orderId,
            );
            return result;
        } catch (error) {
            throw new HttpException(
                `Failed to confirm payment: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create Stripe payment intent (direct)
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
