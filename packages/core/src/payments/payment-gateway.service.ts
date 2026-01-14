/**
 * Payment Gateway Service
 * Unified handler for all payment methods:
 * - Stripe (Visa, Mastercard)
 * - Cash on Delivery
 * - Mobile Wallets (PayPal)
 * - e-Wallets (Mada, STC Pay placeholder)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { stripe, STRIPE_CONFIG } from './stripe.config';

export type PaymentMethod =
    | 'visa'
    | 'mastercard'
    | 'cash'
    | 'paypal'
    | 'mada'
    | 'stc_pay'
    | 'apple_pay'
    | 'google_pay';

export interface ProcessPaymentInput {
    orderId: number;
    method: PaymentMethod;
    customerEmail?: string;
}

@Injectable()
export class PaymentGatewayService {
    private readonly logger = new Logger(PaymentGatewayService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventService: EventService,
    ) { }

    /**
     * Process payment based on method
     */
    async processPayment(
        tenantSchema: string,
        tenantId: string,
        input: ProcessPaymentInput,
    ): Promise<any> {
        const method = input.method.toLowerCase() as PaymentMethod;

        this.logger.log(`Processing ${method} payment for order ${input.orderId}`);

        switch (method) {
            case 'visa':
            case 'mastercard':
            case 'apple_pay':
            case 'google_pay':
                return this.handleStripePayment(tenantSchema, tenantId, input);

            case 'cash':
                return this.handleCashPayment(tenantSchema, tenantId, input);

            case 'paypal':
                return this.handlePayPalPayment(tenantSchema, tenantId, input);

            case 'mada':
            case 'stc_pay':
                return this.handleLocalWalletPayment(tenantSchema, tenantId, input);

            default:
                throw new Error(`Unsupported payment method: ${method}`);
        }
    }

    /**
     * Handle Stripe payments (Visa, Mastercard, Apple Pay, Google Pay)
     */
    private async handleStripePayment(
        tenantSchema: string,
        tenantId: string,
        input: ProcessPaymentInput,
    ): Promise<any> {
        const order = await this.getOrder(tenantSchema, input.orderId);

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: order.total,
            currency: STRIPE_CONFIG.currency,
            payment_method_types: this.getStripePaymentMethods(input.method),
            metadata: {
                orderId: input.orderId.toString(),
                tenantId,
                tenantSchema,
                orderCode: order.code,
                paymentMethod: input.method,
            },
            receipt_email: input.customerEmail || order.customer_email,
        });

        // Update order with payment intent
        await this.updateOrderPayment(tenantSchema, input.orderId, {
            paymentMethod: input.method,
            state: 'PaymentPending',
        });

        await this.logPaymentEvent(tenantId, 'payment.initiated', {
            method: input.method,
            orderId: input.orderId,
            paymentIntentId: paymentIntent.id,
        });

        return {
            type: 'stripe',
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: order.total,
            currency: STRIPE_CONFIG.currency,
        };
    }

    /**
     * Handle Cash on Delivery
     */
    private async handleCashPayment(
        tenantSchema: string,
        tenantId: string,
        input: ProcessPaymentInput,
    ): Promise<any> {
        const order = await this.getOrder(tenantSchema, input.orderId);

        // Mark order as COD pending
        await this.updateOrderPayment(tenantSchema, input.orderId, {
            paymentMethod: 'cash',
            state: 'CashOnDelivery',
        });

        await this.logPaymentEvent(tenantId, 'payment.cod.confirmed', {
            orderId: input.orderId,
            amount: order.total,
        });

        return {
            type: 'cash',
            message: 'Cash on Delivery confirmed',
            orderId: input.orderId,
            total: order.total,
            instructions: 'Please pay the delivery person upon receipt.',
        };
    }

    /**
     * Handle PayPal payments (placeholder - configure API key later)
     */
    private async handlePayPalPayment(
        tenantSchema: string,
        tenantId: string,
        input: ProcessPaymentInput,
    ): Promise<any> {
        const order = await this.getOrder(tenantSchema, input.orderId);

        // PayPal integration placeholder
        // TODO: Implement with PayPal SDK when API keys are configured
        const paypalOrderId = `PP-${Date.now()}`;

        await this.updateOrderPayment(tenantSchema, input.orderId, {
            paymentMethod: 'paypal',
            state: 'PaymentPending',
        });

        await this.logPaymentEvent(tenantId, 'payment.paypal.initiated', {
            orderId: input.orderId,
            paypalOrderId,
        });

        return {
            type: 'paypal',
            paypalOrderId,
            amount: order.total,
            currency: STRIPE_CONFIG.currency,
            // In production, this would be the PayPal approval URL
            approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`,
            message: 'PayPal integration pending API key configuration',
        };
    }

    /**
     * Handle local wallet payments (Mada, STC Pay)
     */
    private async handleLocalWalletPayment(
        tenantSchema: string,
        tenantId: string,
        input: ProcessPaymentInput,
    ): Promise<any> {
        const order = await this.getOrder(tenantSchema, input.orderId);

        // Local wallet placeholder
        // TODO: Integrate with Moyasar, HyperPay, or similar for Mada/STC Pay
        const walletOrderId = `WALLET-${Date.now()}`;

        await this.updateOrderPayment(tenantSchema, input.orderId, {
            paymentMethod: input.method,
            state: 'PaymentPending',
        });

        await this.logPaymentEvent(tenantId, `payment.${input.method}.initiated`, {
            orderId: input.orderId,
            walletOrderId,
        });

        return {
            type: input.method,
            walletOrderId,
            amount: order.total,
            currency: STRIPE_CONFIG.currency,
            message: `${input.method.toUpperCase()} integration pending API key configuration`,
        };
    }

    /**
     * Confirm payment (for COD or manual confirmation)
     */
    async confirmPayment(
        tenantSchema: string,
        tenantId: string,
        orderId: number,
    ): Promise<any> {
        await this.updateOrderPayment(tenantSchema, orderId, {
            state: 'Paid',
        });

        await this.logPaymentEvent(tenantId, 'payment.confirmed', { orderId });

        return { success: true, orderId, state: 'Paid' };
    }

    /**
     * Get order from tenant schema
     */
    private async getOrder(tenantSchema: string, orderId: number): Promise<any> {
        const order = await this.prisma.$queryRawUnsafe(`
      SELECT o.*, c.email as customer_email
      FROM "${tenantSchema}"."vendure_order" o
      LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = o.customer_id
      WHERE o.id = $1
    `, orderId);

        if ((order as any[]).length === 0) {
            throw new Error('Order not found');
        }

        return (order as any[])[0];
    }

    /**
     * Update order payment info
     */
    private async updateOrderPayment(
        tenantSchema: string,
        orderId: number,
        data: { paymentMethod?: string; state?: string },
    ): Promise<void> {
        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.paymentMethod) {
            values.push(data.paymentMethod);
            paramIndex++;
        }
        if (data.state) {
            updates.push(`state = $${paramIndex}`);
            values.push(data.state);
            paramIndex++;
        }

        values.push(orderId);

        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_order"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, ...values);
    }

    /**
     * Log payment event
     */
    private async logPaymentEvent(tenantId: string, type: string, payload: any): Promise<void> {
        await this.eventService.record({ type, tenantId, payload });
        this.logger.log(`Event: ${type} for tenant ${tenantId}`);
    }

    /**
     * Get Stripe payment method types
     */
    private getStripePaymentMethods(method: PaymentMethod): string[] {
        switch (method) {
            case 'visa':
            case 'mastercard':
                return ['card'];
            case 'apple_pay':
                return ['card']; // Apple Pay uses card
            case 'google_pay':
                return ['card']; // Google Pay uses card
            default:
                return ['card'];
        }
    }

    /**
     * Get supported payment methods
     */
    getSupportedMethods(): PaymentMethod[] {
        return [
            'visa',
            'mastercard',
            'cash',
            'paypal',
            'mada',
            'stc_pay',
            'apple_pay',
            'google_pay',
        ];
    }
}
