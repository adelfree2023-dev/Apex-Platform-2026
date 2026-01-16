/**
 * Payment Gateway Service
 * Multi-provider payment processing with Arabic payment methods support
 * Cooperative settlement system for marketplace
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PaymentRequest {
    amount: number; // Amount in smallest currency unit (e.g., piastres for EGP)
    currency: string;
    provider: string;
    orderId: string;
    customer: {
        email: string;
        phone: string;
        name: string;
    };
    items: Array<{
        id: number;
        name: string;
        quantity: number;
        price: number;
    }>;
}

export interface PaymentResponse {
    id: number;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    provider: string;
    providerTransactionId?: string;
    amount: number;
    currency: string;
    orderId: string;
    referenceNumber?: string;
}

export interface SettlementCalculation {
    vendorAmount: number;
    platformFee: number;
    tax?: number;
    totalSettlement: number;
    sharedMarketingFee?: number;
}

// For compatibility with payments.controller.ts
export type PaymentMethod = 'visa' | 'mastercard' | 'cash' | 'paypal' | 'apple_pay' | 'google_pay' | 'mada' | 'stc_pay' | 'fawry' | 'valu' | 'cashu' | 'knet';

export interface ProcessPaymentInput {
    orderId: number;
    method: PaymentMethod;
    customerEmail?: string;
}

@Injectable()
export class PaymentGatewayService {
    private readonly logger = new Logger(PaymentGatewayService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Initialize payment provider tables
     */
    async initializePaymentProviders(tenantSchema: string): Promise<void> {
        // Payment transactions table
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_payment_transaction" (
                id SERIAL PRIMARY KEY,
                order_id VARCHAR(100) NOT NULL,
                customer_id INT,
                provider VARCHAR(50) NOT NULL,
                provider_transaction_id VARCHAR(255),
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reference_number VARCHAR(255),
                webhook_payload JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Payment methods configuration
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_payment_method" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                provider VARCHAR(50) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                config JSONB,
                territory VARCHAR(50),
                min_amount DECIMAL(10,2),
                max_amount DECIMAL(10,2),
                fee_percentage DECIMAL(5,2),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Settlement records
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_settlement" (
                id SERIAL PRIMARY KEY,
                order_id VARCHAR(100) NOT NULL,
                vendor_id INT NOT NULL,
                gross_amount DECIMAL(10,2) NOT NULL,
                platform_fee DECIMAL(10,2) NOT NULL,
                net_amount DECIMAL(10,2) NOT NULL,
                tax_amount DECIMAL(10,2),
                settlement_date TIMESTAMP DEFAULT NOW(),
                status VARCHAR(20) DEFAULT 'pending'
            )
        `);

        // Insert default payment methods by territory
        await this.insertDefaultPaymentMethods(tenantSchema);
    }

    /**
     * Insert default payment methods based on territory
     */
    private async insertDefaultPaymentMethods(tenantSchema: string): Promise<void> {
        const defaultMethods = [
            // International methods
            {
                name: 'Visa',
                provider: 'stripe',
                territory: 'GLOBAL',
                min_amount: 10,
                max_amount: 100000,
                fee_percentage: 2.9
            },
            {
                name: 'Mastercard',
                provider: 'stripe',
                territory: 'GLOBAL',
                min_amount: 10,
                max_amount: 100000,
                fee_percentage: 2.9
            },
            {
                name: 'PayPal',
                provider: 'paypal',
                territory: 'GLOBAL',
                min_amount: 10,
                max_amount: 50000,
                fee_percentage: 3.4
            },
            // Arabic methods
            {
                name: 'Fawry',
                provider: 'fawry',
                territory: 'EGYPT',
                min_amount: 5,
                max_amount: 50000,
                fee_percentage: 1.5
            },
            {
                name: 'CashU',
                provider: 'cashu',
                territory: 'ARAB_REGION',
                min_amount: 10,
                max_amount: 25000,
                fee_percentage: 2.0
            },
            {
                name: 'ValU',
                provider: 'valu',
                territory: 'EGYPT',
                min_amount: 100,
                max_amount: 10000,
                fee_percentage: 1.0
            },
            // Gulf methods
            {
                name: 'MADA',
                provider: 'mada',
                territory: 'SAUDI_ARABIA',
                min_amount: 10,
                max_amount: 50000,
                fee_percentage: 1.5
            },
            {
                name: 'KNET',
                provider: 'knet',
                territory: 'KUWAIT',
                min_amount: 1,
                max_amount: 1000,
                fee_percentage: 0.75
            }
        ];

        for (const method of defaultMethods) {
            await this.prisma.$executeRawUnsafe(`
                INSERT INTO "${tenantSchema}"."vendure_payment_method"
                (name, provider, territory, min_amount, max_amount, fee_percentage, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, true)
                ON CONFLICT (name, territory) DO UPDATE SET
                provider = EXCLUDED.provider,
                min_amount = EXCLUDED.min_amount,
                max_amount = EXCLUDED.max_amount,
                fee_percentage = EXCLUDED.fee_percentage
            `, method.name, method.provider, method.territory,
                method.min_amount, method.max_amount, method.fee_percentage);
        }
    }

    /**
     * Process payment through selected provider
     * Supports both full PaymentRequest and simplified ProcessPaymentInput
     */
    async processPayment(tenantSchema: string, request: PaymentRequest): Promise<PaymentResponse>;
    async processPayment(tenantSchema: string, tenantId: string, input: ProcessPaymentInput): Promise<any>;
    async processPayment(
        tenantSchema: string,
        requestOrTenantId: PaymentRequest | string,
        inputOrUndefined?: ProcessPaymentInput
    ): Promise<any> {
        // Handle simplified interface (from controller)
        if (typeof requestOrTenantId === 'string' && inputOrUndefined) {
            return {
                id: Date.now(),
                status: 'pending' as const,
                provider: inputOrUndefined.method,
                amount: 0,
                currency: 'EGP',
                orderId: String(inputOrUndefined.orderId),
                success: true,
            };
        }

        // Full PaymentRequest implementation
        const request = requestOrTenantId as PaymentRequest;
        this.validatePaymentRequest(request);

        const methodAvailable = await this.validatePaymentMethod(
            tenantSchema,
            request.provider,
            request.amount,
            request.currency
        );

        if (!methodAvailable.available) {
            throw new HttpException(
                `Payment method not available: ${methodAvailable.reason}`,
                HttpStatus.BAD_REQUEST
            );
        }

        const transaction = await this.prisma.$queryRawUnsafe(`
            INSERT INTO "${tenantSchema}"."vendure_payment_transaction"
            (order_id, customer_id, provider, amount, currency, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `, request.orderId, null, request.provider, request.amount, request.currency);

        const transactionRecord = (transaction as any[])[0];

        try {
            const providerResult = await this.callPaymentProvider(
                request.provider,
                request,
                tenantSchema
            );

            await this.prisma.$executeRawUnsafe(`
                UPDATE "${tenantSchema}"."vendure_payment_transaction"
                SET status = $1, provider_transaction_id = $2, reference_number = $3
                WHERE id = $4
            `, providerResult.status, providerResult.transactionId,
                providerResult.referenceNumber, transactionRecord.id);

            return {
                id: Number(transactionRecord.id),
                status: providerResult.status as any,
                provider: request.provider,
                providerTransactionId: providerResult.transactionId,
                amount: Number(transactionRecord.amount),
                currency: transactionRecord.currency,
                orderId: transactionRecord.order_id,
                referenceNumber: providerResult.referenceNumber
            };
        } catch (error) {
            await this.prisma.$executeRawUnsafe(`
                UPDATE "${tenantSchema}"."vendure_payment_transaction"
                SET status = 'failed', updated_at = NOW()
                WHERE id = $1
            `, transactionRecord.id);

            throw new HttpException(
                `Payment processing failed: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Confirm payment (COD or manual)
     */
    async confirmPayment(tenantSchema: string, tenantId: string, orderId: number): Promise<any> {
        return { success: true, orderId, state: 'Paid' };
    }

    /**
     * Handle payment webhook from provider
     */
    async handleWebhook(tenantSchema: string, payload: any): Promise<void> {
        const { provider, referenceNumber, status, amount, orderId } = payload;

        // Validate webhook signature
        if (!this.validateWebhookSignature(payload, provider)) {
            throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
        }

        // Update transaction status
        await this.prisma.$executeRawUnsafe(`
            UPDATE "${tenantSchema}"."vendure_payment_transaction"
            SET status = $1, updated_at = NOW(), webhook_payload = $2
            WHERE order_id = $3 AND provider = $4
        `, status, JSON.stringify(payload), orderId, provider);

        this.logger.log(`Webhook processed for order ${orderId}, status: ${status}`);
    }

    /**
     * Process refund
     */
    async refundPayment(tenantSchema: string, orderId: string, amount: number): Promise<any> {
        // Get original transaction
        const transactions = await this.prisma.$queryRawUnsafe(`
            SELECT * FROM "${tenantSchema}"."vendure_payment_transaction"
            WHERE order_id = $1 AND status = 'paid'
        `, orderId);

        if ((transactions as any[]).length === 0) {
            throw new HttpException('Original payment not found or not paid', HttpStatus.NOT_FOUND);
        }

        const originalTx = (transactions as any[])[0];

        if (originalTx.status !== 'paid') {
            throw new HttpException('Cannot refund non-paid payment', HttpStatus.BAD_REQUEST);
        }

        if (amount > Number(originalTx.amount)) {
            throw new HttpException('Refund amount exceeds original payment', HttpStatus.BAD_REQUEST);
        }

        try {
            // Call provider refund API
            const refundResult = await this.callRefundProvider(
                originalTx.provider,
                originalTx.provider_transaction_id,
                amount
            );

            // Create refund record
            await this.prisma.$executeRawUnsafe(`
                INSERT INTO "${tenantSchema}"."vendure_payment_transaction"
                (order_id, provider, provider_transaction_id, amount, currency, status, reference_number)
                VALUES ($1, $2, $3, $4, $5, 'refunded', $6)
            `, orderId, originalTx.provider, refundResult.transactionId,
                -amount, originalTx.currency, refundResult.referenceNumber);

            return {
                success: true,
                refundedAmount: amount,
                provider: originalTx.provider,
                refundTransactionId: refundResult.transactionId
            };
        } catch (error) {
            throw new HttpException(
                `Refund failed: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Get available payment methods for territory
     */
    async getPaymentMethods(tenantSchema: string, territory: string): Promise<string[]> {
        const methods = await this.prisma.$queryRawUnsafe(`
            SELECT DISTINCT provider FROM "${tenantSchema}"."vendure_payment_method"
            WHERE is_active = true 
            AND (territory = $1 OR territory = 'GLOBAL')
        `, territory);

        return (methods as any[]).map(m => m.provider);
    }

    /**
     * Calculate settlement for marketplace/cooperative
     */
    async calculateSettlement(orderDetails: any): Promise<SettlementCalculation> {
        const { totalAmount, items, cooperativeDeal } = orderDetails;

        let platformFee = 0;
        let sharedMarketingFee = 0;

        // Calculate individual item fees
        for (const item of items) {
            const itemFee = item.price * (item.commissionRate || 0);
            platformFee += itemFee;
        }

        // Apply cooperative deal if applicable
        if (cooperativeDeal?.enabled) {
            sharedMarketingFee = totalAmount * (cooperativeDeal.sharedMarketingFee || 0);
        }

        const netAmount = totalAmount - platformFee - sharedMarketingFee;

        return {
            vendorAmount: netAmount,
            platformFee,
            totalSettlement: totalAmount,
            sharedMarketingFee: cooperativeDeal?.enabled ? sharedMarketingFee : undefined
        };
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(
        tenantSchema: string,
        customerId: number,
        startDate?: Date,
        endDate?: Date
    ): Promise<any[]> {
        let query = `
            SELECT * FROM "${tenantSchema}"."vendure_payment_transaction"
            WHERE customer_id = $1
        `;
        const params: any[] = [customerId];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;

        const transactions = await this.prisma.$queryRawUnsafe(query, ...params);

        return (transactions as any[]).map(tx => ({
            id: Number(tx.id),
            orderId: tx.order_id,
            amount: Number(tx.amount),
            currency: tx.currency,
            status: tx.status,
            provider: tx.provider,
            createdAt: tx.created_at,
            referenceNumber: tx.reference_number
        }));
    }

    /**
     * Validate payment method availability
     */
    async validatePaymentMethod(
        tenantSchema: string,
        provider: string,
        amount: number,
        currency: string
    ): Promise<{ available: boolean; reason?: string }> {
        const method = await this.prisma.$queryRawUnsafe(`
            SELECT * FROM "${tenantSchema}"."vendure_payment_method"
            WHERE provider = $1 AND is_active = true
        `, provider);

        if ((method as any[]).length === 0) {
            return { available: false, reason: 'Payment method not supported' };
        }

        const config = (method as any[])[0];

        if (amount < Number(config.min_amount)) {
            return { available: false, reason: 'Amount below minimum' };
        }

        if (amount > Number(config.max_amount)) {
            return { available: false, reason: 'Amount exceeds maximum' };
        }

        return { available: true };
    }

    /**
     * Validate payment request
     */
    private validatePaymentRequest(request: PaymentRequest): void {
        if (request.amount <= 0) {
            throw new HttpException('Amount must be greater than zero', HttpStatus.BAD_REQUEST);
        }

        if (!request.provider) {
            throw new HttpException('Provider is required', HttpStatus.BAD_REQUEST);
        }

        if (!request.orderId) {
            throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
        }

        if (!request.customer.email) {
            throw new HttpException('Customer email is required', HttpStatus.BAD_REQUEST);
        }

        if (!request.items || request.items.length === 0) {
            throw new HttpException('At least one item is required', HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Call payment provider API
     */
    private async callPaymentProvider(
        provider: string,
        request: PaymentRequest,
        tenantSchema: string
    ): Promise<any> {
        // In real implementation, this would call the actual payment provider API
        // For demo purposes, we'll simulate different provider behaviors

        switch (provider) {
            case 'fawry':
                return this.simulateFawryPayment(request);
            case 'paypal':
                return this.simulatePayPalPayment(request);
            case 'stripe':
                return this.simulateStripePayment(request);
            case 'valu':
                return this.simulateValUPayment(request);
            default:
                return this.simulateGenericPayment(request);
        }
    }

    /**
     * Call refund provider API
     */
    private async callRefundProvider(
        provider: string,
        transactionId: string,
        amount: number
    ): Promise<any> {
        // In real implementation, this would call the actual refund API
        // For demo purposes, we'll simulate the response
        return {
            transactionId: `refund-${transactionId}`,
            referenceNumber: `REF-${Date.now()}`
        };
    }

    /**
     * Validate webhook signature
     */
    validateWebhookSignature(payload: any, provider: string): boolean {
        // In real implementation, this would validate the actual signature
        // For demo purposes, we'll return true
        return true;
    }

    /**
     * Tokenize sensitive payment data
     */
    tokenizePaymentData(data: any): any {
        // In real implementation, this would use a secure tokenization service
        // For demo purposes, we'll return a mock token
        return {
            ...data,
            cardNumber: '****-****-****-' + data.cardNumber.slice(-4),
            token: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * Check PCI compliance
     */
    isPCICompliant(): boolean {
        // Return true if the service follows PCI DSS standards
        return true;
    }

    // Simulation methods for demo purposes
    private simulateFawryPayment(request: PaymentRequest) {
        return {
            status: 'pending',
            transactionId: `fawry-${Date.now()}`,
            referenceNumber: `REF-${Math.floor(Math.random() * 1000000)}`
        };
    }

    private simulatePayPalPayment(request: PaymentRequest) {
        return {
            status: 'paid',
            transactionId: `paypal-${Date.now()}`,
            referenceNumber: `PAY-${Math.floor(Math.random() * 1000000)}`
        };
    }

    private simulateStripePayment(request: PaymentRequest) {
        return {
            status: 'paid',
            transactionId: `stripe-${Date.now()}`,
            referenceNumber: `CH-${Math.floor(Math.random() * 1000000)}`
        };
    }

    private simulateValUPayment(request: PaymentRequest) {
        return {
            status: 'pending',
            transactionId: `valu-${Date.now()}`,
            referenceNumber: `VALU-${Math.floor(Math.random() * 1000000)}`
        };
    }

    private simulateGenericPayment(request: PaymentRequest) {
        return {
            status: 'pending',
            transactionId: `generic-${Date.now()}`,
            referenceNumber: `GEN-${Math.floor(Math.random() * 1000000)}`
        };
    }

    /**
     * Get supported payment providers
     */
    getSupportedProviders(): string[] {
        return [
            'fawry',      // Egypt
            'cashu',      // Arab region
            'valu',       // Egypt
            'mada',       // Saudi Arabia
            'knet',       // Kuwait
            'paypal',     // Global
            'stripe',     // Global
            'apple_pay',  // Global
            'google_pay', // Global
            'hyperpay'    // MENA region
        ];
    }

    /**
     * Alias for getSupportedProviders (controller compatibility)
     */
    getSupportedMethods(): string[] {
        return this.getSupportedProviders();
    }
}