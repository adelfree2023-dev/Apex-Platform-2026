/**
 * Subscription Service
 * Recurring payments and subscription management
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SubscriptionPlanData {
    name: string;
    description?: string;
    price: number;
    interval: 'weekly' | 'monthly' | 'yearly';
    productIds?: number[];
    features?: string[];
}

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create subscription tables
     */
    async createSubscriptionTables(tenantSchema: string): Promise<void> {
        // Subscription plans
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_subscription_plan" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        interval VARCHAR(20) NOT NULL,
        interval_count INT DEFAULT 1,
        product_ids INT[],
        features TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Customer subscriptions
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_subscription" (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL,
        plan_id INT REFERENCES "${tenantSchema}"."vendure_subscription_plan"(id),
        status VARCHAR(50) DEFAULT 'active',
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        cancel_at_period_end BOOLEAN DEFAULT false,
        cancelled_at TIMESTAMP,
        payment_method VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Subscription payments history
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_subscription_payment" (
        id SERIAL PRIMARY KEY,
        subscription_id INT REFERENCES "${tenantSchema}"."vendure_subscription"(id),
        amount INT NOT NULL,
        status VARCHAR(50),
        payment_date TIMESTAMP DEFAULT NOW(),
        invoice_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Insert default plans
        const defaultPlans = [
            { name: 'Basic', desc: 'Basic subscription', price: 9900, interval: 'monthly' },
            { name: 'Premium', desc: 'Premium features included', price: 19900, interval: 'monthly' },
            { name: 'Enterprise', desc: 'Full access for businesses', price: 49900, interval: 'monthly' },
        ];

        for (const plan of defaultPlans) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_subscription_plan" (name, description, price, interval)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, plan.name, plan.desc, plan.price, plan.interval);
        }
    }

    /**
     * Get all plans
     */
    async getPlans(tenantSchema: string): Promise<any[]> {
        try {
            const plans = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_subscription_plan"
        WHERE is_active = true
        ORDER BY price ASC
      `);

            return (plans as any[]).map(p => this.serializePlan(p));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get plan by ID
     */
    async getPlan(tenantSchema: string, planId: number): Promise<any | null> {
        try {
            const plan = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_subscription_plan"
        WHERE id = $1
      `, planId);

            return (plan as any[]).length > 0 ? this.serializePlan((plan as any[])[0]) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Create subscription plan
     */
    async createPlan(tenantSchema: string, data: SubscriptionPlanData): Promise<any> {
        const result = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_subscription_plan" 
      (name, description, price, interval, product_ids, features)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
            data.name,
            data.description || null,
            data.price,
            data.interval,
            data.productIds || null,
            data.features || null
        );

        return this.serializePlan((result as any[])[0]);
    }

    /**
     * Subscribe customer to plan
     */
    async subscribe(tenantSchema: string, customerId: number, planId: number, paymentMethod?: string): Promise<any> {
        // Get plan
        const plan = await this.getPlan(tenantSchema, planId);
        if (!plan) throw new Error('Plan not found');

        // Calculate period
        const now = new Date();
        const periodEnd = new Date(now);

        switch (plan.interval) {
            case 'weekly':
                periodEnd.setDate(periodEnd.getDate() + 7);
                break;
            case 'monthly':
                periodEnd.setMonth(periodEnd.getMonth() + 1);
                break;
            case 'yearly':
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                break;
        }

        // Check if already subscribed
        const existing = await this.prisma.$queryRawUnsafe(`
      SELECT id FROM "${tenantSchema}"."vendure_subscription"
      WHERE customer_id = $1 AND plan_id = $2 AND status = 'active'
    `, customerId, planId);

        if ((existing as any[]).length > 0) {
            throw new Error('Already subscribed to this plan');
        }

        // Create subscription
        const subscription = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_subscription" 
      (customer_id, plan_id, status, current_period_start, current_period_end, payment_method)
      VALUES ($1, $2, 'active', $3, $4, $5)
      RETURNING *
    `, customerId, planId, now, periodEnd, paymentMethod || null);

        const subscriptionId = Number((subscription as any[])[0].id);

        // Record payment
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_subscription_payment" 
      (subscription_id, amount, status)
      VALUES ($1, $2, 'paid')
    `, subscriptionId, plan.price);

        return this.getSubscription(tenantSchema, subscriptionId);
    }

    /**
     * Get subscription
     */
    async getSubscription(tenantSchema: string, subscriptionId: number): Promise<any | null> {
        try {
            const sub = await this.prisma.$queryRawUnsafe(`
        SELECT s.*, p.name as plan_name, p.price as plan_price, p.interval as plan_interval
        FROM "${tenantSchema}"."vendure_subscription" s
        JOIN "${tenantSchema}"."vendure_subscription_plan" p ON p.id = s.plan_id
        WHERE s.id = $1
      `, subscriptionId);

            if ((sub as any[]).length === 0) return null;

            return this.serializeSubscription((sub as any[])[0]);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get customer subscriptions
     */
    async getCustomerSubscriptions(tenantSchema: string, customerId: number): Promise<any[]> {
        try {
            const subs = await this.prisma.$queryRawUnsafe(`
        SELECT s.*, p.name as plan_name, p.price as plan_price, p.interval as plan_interval
        FROM "${tenantSchema}"."vendure_subscription" s
        JOIN "${tenantSchema}"."vendure_subscription_plan" p ON p.id = s.plan_id
        WHERE s.customer_id = $1
        ORDER BY s.created_at DESC
      `, customerId);

            return (subs as any[]).map(s => this.serializeSubscription(s));
        } catch (error) {
            return [];
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(tenantSchema: string, subscriptionId: number, immediately: boolean = false): Promise<any> {
        if (immediately) {
            await this.prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."vendure_subscription"
        SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, subscriptionId);
        } else {
            // Cancel at period end
            await this.prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."vendure_subscription"
        SET cancel_at_period_end = true, updated_at = NOW()
        WHERE id = $1
      `, subscriptionId);
        }

        return this.getSubscription(tenantSchema, subscriptionId);
    }

    /**
     * Renew subscription
     */
    async renewSubscription(tenantSchema: string, subscriptionId: number): Promise<any> {
        const sub = await this.getSubscription(tenantSchema, subscriptionId);
        if (!sub) throw new Error('Subscription not found');

        const plan = await this.getPlan(tenantSchema, sub.planId);
        if (!plan) throw new Error('Plan not found');

        // Calculate new period
        const newStart = new Date(sub.currentPeriodEnd);
        const newEnd = new Date(newStart);

        switch (plan.interval) {
            case 'weekly':
                newEnd.setDate(newEnd.getDate() + 7);
                break;
            case 'monthly':
                newEnd.setMonth(newEnd.getMonth() + 1);
                break;
            case 'yearly':
                newEnd.setFullYear(newEnd.getFullYear() + 1);
                break;
        }

        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_subscription"
      SET current_period_start = $1, current_period_end = $2, status = 'active', updated_at = NOW()
      WHERE id = $3
    `, newStart, newEnd, subscriptionId);

        // Record payment
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_subscription_payment" 
      (subscription_id, amount, status)
      VALUES ($1, $2, 'paid')
    `, subscriptionId, plan.price);

        return this.getSubscription(tenantSchema, subscriptionId);
    }

    /**
     * Get payment history
     */
    async getPaymentHistory(tenantSchema: string, subscriptionId: number): Promise<any[]> {
        try {
            const payments = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_subscription_payment"
        WHERE subscription_id = $1
        ORDER BY payment_date DESC
      `, subscriptionId);

            return (payments as any[]).map(p => ({
                id: Number(p.id),
                subscriptionId: Number(p.subscription_id),
                amount: Number(p.amount),
                status: p.status,
                paymentDate: p.payment_date,
                invoiceId: p.invoice_id,
            }));
        } catch (error) {
            return [];
        }
    }

    private serializePlan(p: any): any {
        return {
            id: Number(p.id),
            name: p.name,
            description: p.description,
            price: Number(p.price),
            interval: p.interval,
            intervalCount: Number(p.interval_count || 1),
            productIds: p.product_ids,
            features: p.features,
            isActive: p.is_active,
        };
    }

    private serializeSubscription(s: any): any {
        return {
            id: Number(s.id),
            customerId: Number(s.customer_id),
            planId: Number(s.plan_id),
            planName: s.plan_name,
            planPrice: s.plan_price ? Number(s.plan_price) : null,
            planInterval: s.plan_interval,
            status: s.status,
            currentPeriodStart: s.current_period_start,
            currentPeriodEnd: s.current_period_end,
            cancelAtPeriodEnd: s.cancel_at_period_end,
            cancelledAt: s.cancelled_at,
            createdAt: s.created_at,
        };
    }
}
