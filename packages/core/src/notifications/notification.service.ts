/**
 * Notification Service
 * Handles in-app notifications for tenants
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';


export interface NotificationPayload {
    type: 'order' | 'payment' | 'fulfillment' | 'system' | 'promo';
    title: string;
    message: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventService: EventService,
    ) { }

    /**
     * Create notification table (migration)
     */
    async createNotificationTable(tenantSchema: string): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_notification" (
        id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES "${tenantSchema}"."vendure_customer"(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Webhook subscriptions table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_webhook" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL,
        secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Create notification
     */
    async createNotification(
        tenantSchema: string,
        customerId: number,
        payload: NotificationPayload,
    ): Promise<any> {
        const notification = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_notification" 
      (customer_id, type, title, message, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, customerId, payload.type, payload.title, payload.message, JSON.stringify(payload.metadata || {}));

        // Log event
        await this.eventService.record({
            type: 'notification.created',
            tenantId: tenantSchema,
            territory: 'default',
            businessType: 'RETAIL',
            payload: {
                customerId,
                notificationType: payload.type,
                title: payload.title,
            },
        });

        return (notification as any[])[0];
    }

    /**
     * Get customer notifications
     */
    async getNotifications(tenantSchema: string, customerId: number): Promise<any[]> {
        const notifications = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_notification"
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, customerId);

        return notifications as any[];
    }

    /**
     * Get unread notifications count
     */
    async getUnreadCount(tenantSchema: string, customerId: number): Promise<number> {
        const result = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${tenantSchema}"."vendure_notification"
      WHERE customer_id = $1 AND is_read = false
    `, customerId);

        return parseInt((result as any[])[0]?.count || '0', 10);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(tenantSchema: string, notificationId: number): Promise<any> {
        const notification = await this.prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_notification"
      SET is_read = true
      WHERE id = $1
      RETURNING *
    `, notificationId);

        return (notification as any[])[0];
    }

    /**
     * Mark all as read
     */
    async markAllAsRead(tenantSchema: string, customerId: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_notification"
      SET is_read = true
      WHERE customer_id = $1 AND is_read = false
    `, customerId);
    }

    // ==================== WEBHOOK METHODS ====================

    /**
     * Register webhook
     */
    async registerWebhook(
        tenantSchema: string,
        name: string,
        url: string,
        events: string[],
        secret?: string,
    ): Promise<any> {
        const webhook = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_webhook" (name, url, events, secret)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, name, url, events, secret || null);

        return (webhook as any[])[0];
    }

    /**
     * Get webhooks
     */
    async getWebhooks(tenantSchema: string): Promise<any[]> {
        const webhooks = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_webhook"
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

        return webhooks as any[];
    }

    /**
     * Trigger webhook
     */
    async triggerWebhooks(tenantSchema: string, event: string, payload: any): Promise<void> {
        const webhooks = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_webhook"
      WHERE is_active = true AND $1 = ANY(events)
    `, event);

        for (const webhook of webhooks as any[]) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Event': event,
                        'X-Webhook-Secret': webhook.secret || '',
                    },
                    body: JSON.stringify({
                        event,
                        timestamp: new Date().toISOString(),
                        payload,
                    }),
                });

                this.logger.log(`Webhook ${webhook.name} triggered: ${response.status}`);
            } catch (error) {
                this.logger.error(`Webhook ${webhook.name} failed: ${error}`);
            }
        }
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(tenantSchema: string, webhookId: number): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_webhook"
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, webhookId);
    }

    // ==================== NOTIFICATION TRIGGERS ====================

    /**
     * Notify on order created
     */
    async notifyOrderCreated(tenantSchema: string, customerId: number, orderId: number, orderCode: string, total: number): Promise<void> {
        await this.createNotification(tenantSchema, customerId, {
            type: 'order',
            title: 'Order Placed!',
            message: `Your order ${orderCode} has been placed. Total: EGP ${(total / 100).toFixed(2)}`,
            metadata: { orderId, orderCode },
        });

        await this.triggerWebhooks(tenantSchema, 'order.created', { orderId, orderCode, total });
    }

    /**
     * Notify on order shipped
     */
    async notifyOrderShipped(tenantSchema: string, customerId: number, orderId: number, trackingCode: string, carrier: string): Promise<void> {
        await this.createNotification(tenantSchema, customerId, {
            type: 'fulfillment',
            title: 'Order Shipped!',
            message: `Your order is on the way! Tracking: ${trackingCode} via ${carrier}`,
            metadata: { orderId, trackingCode, carrier },
        });

        await this.triggerWebhooks(tenantSchema, 'order.shipped', { orderId, trackingCode, carrier });
    }

    /**
     * Notify on order delivered
     */
    async notifyOrderDelivered(tenantSchema: string, customerId: number, orderId: number): Promise<void> {
        await this.createNotification(tenantSchema, customerId, {
            type: 'fulfillment',
            title: 'Order Delivered!',
            message: 'Your order has been delivered. Enjoy!',
            metadata: { orderId },
        });

        await this.triggerWebhooks(tenantSchema, 'order.delivered', { orderId });
    }

    /**
     * Notify on payment received
     */
    async notifyPaymentReceived(tenantSchema: string, customerId: number, orderId: number, amount: number): Promise<void> {
        await this.createNotification(tenantSchema, customerId, {
            type: 'payment',
            title: 'Payment Confirmed',
            message: `Payment of EGP ${(amount / 100).toFixed(2)} received. Thank you!`,
            metadata: { orderId, amount },
        });

        await this.triggerWebhooks(tenantSchema, 'payment.received', { orderId, amount });
    }
}
