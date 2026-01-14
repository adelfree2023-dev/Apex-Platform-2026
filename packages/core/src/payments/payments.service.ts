/**
 * Payments Service
 * Handles Stripe payment processing per tenant
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { stripe, STRIPE_CONFIG } from './stripe.config';
import Stripe from 'stripe';

export interface CreatePaymentIntentInput {
    orderId: number;
    customerEmail?: string;
}

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventService: EventService,
    ) { }

    /**
     * Create a Stripe Payment Intent for an order
     */
    async createPaymentIntent(
        tenantSchema: string,
        tenantId: string,
        input: CreatePaymentIntentInput,
    ): Promise<Stripe.PaymentIntent> {
        // Get order details
        const order = await this.prisma.$queryRawUnsafe(`
      SELECT o.*, c.email as customer_email
      FROM "${tenantSchema}"."vendure_order" o
      LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = o.customer_id
      WHERE o.id = $1
    `, input.orderId);

        if ((order as any[]).length === 0) {
            throw new Error('Order not found');
        }

        const orderData = (order as any[])[0];

        if (orderData.state === 'Paid') {
            throw new Error('Order already paid');
        }

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: orderData.total, // Already in cents
            currency: STRIPE_CONFIG.currency,
            metadata: {
                orderId: input.orderId.toString(),
                tenantId,
                tenantSchema,
                orderCode: orderData.code,
            },
            receipt_email: input.customerEmail || orderData.customer_email,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Update order with payment intent ID
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_order"
      SET state = 'PaymentPending', updated_at = NOW()
      WHERE id = $1
    `, input.orderId);

        // Log event
        await this.eventService.record({
            type: 'payment.intent.created',
            tenantId,
            payload: {
                paymentIntentId: paymentIntent.id,
                orderId: input.orderId,
                amount: orderData.total,
            },
        });

        this.logger.log(`Payment intent created: ${paymentIntent.id} for order ${orderData.code}`);

        return paymentIntent;
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(
        payload: Buffer,
        signature: string,
    ): Promise<{ received: boolean; event?: string }> {
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                payload,
                signature,
                STRIPE_CONFIG.webhookSecret,
            );
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err}`);
            throw new Error('Webhook signature verification failed');
        }

        this.logger.log(`Webhook received: ${event.type}`);

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
                break;
            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true, event: event.type };
    }

    /**
     * Handle successful payment
     */
    private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const { orderId, tenantId, tenantSchema } = paymentIntent.metadata;

        if (!orderId || !tenantSchema) {
            this.logger.error('Missing metadata in payment intent');
            return;
        }

        // Update order status to Paid
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_order"
      SET state = 'Paid', updated_at = NOW()
      WHERE id = $1
    `, parseInt(orderId, 10));

        // Log event
        await this.eventService.record({
            type: 'payment.succeeded',
            tenantId,
            payload: {
                paymentIntentId: paymentIntent.id,
                orderId: parseInt(orderId, 10),
                amount: paymentIntent.amount,
            },
        });

        this.logger.log(`Payment succeeded for order ${orderId}`);
    }

    /**
     * Handle failed payment
     */
    private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const { orderId, tenantId, tenantSchema } = paymentIntent.metadata;

        if (!orderId || !tenantSchema) {
            this.logger.error('Missing metadata in payment intent');
            return;
        }

        // Update order status to PaymentFailed
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_order"
      SET state = 'PaymentFailed', updated_at = NOW()
      WHERE id = $1
    `, parseInt(orderId, 10));

        // Log event
        await this.eventService.record({
            type: 'payment.failed',
            tenantId,
            payload: {
                paymentIntentId: paymentIntent.id,
                orderId: parseInt(orderId, 10),
                error: paymentIntent.last_payment_error?.message,
            },
        });

        this.logger.error(`Payment failed for order ${orderId}`);
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        return stripe.paymentIntents.retrieve(paymentIntentId);
    }
}
