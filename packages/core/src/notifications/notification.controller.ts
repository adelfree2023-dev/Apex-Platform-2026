/**
 * Notification Controller
 * API endpoints for notifications and webhooks
 */

import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('api/shop')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    /**
     * Migrate notification tables
     */
    @Post(':tenantId/migrate-notifications')
    async migrateNotifications(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.notificationService.createNotificationTable(tenantSchema);
            return {
                success: true,
                message: 'Notification and webhook tables created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to migrate notifications: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get customer notifications
     */
    @Get(':tenantId/customers/:customerId/notifications')
    async getNotifications(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const notifications = await this.notificationService.getNotifications(
                tenantSchema,
                parseInt(customerId, 10),
            );
            const unreadCount = await this.notificationService.getUnreadCount(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: notifications,
                unreadCount,
                count: notifications.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get notifications: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Mark notification as read
     */
    @Put(':tenantId/notifications/:notificationId/read')
    async markAsRead(
        @Param('tenantId') tenantId: string,
        @Param('notificationId') notificationId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const notification = await this.notificationService.markAsRead(
                tenantSchema,
                parseInt(notificationId, 10),
            );
            return {
                success: true,
                data: notification,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to mark as read: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Mark all notifications as read
     */
    @Put(':tenantId/customers/:customerId/notifications/read-all')
    async markAllAsRead(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.notificationService.markAllAsRead(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                message: 'All notifications marked as read',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to mark all as read: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== WEBHOOK ENDPOINTS ====================

    /**
     * Register webhook
     */
    @Post(':tenantId/webhooks')
    async registerWebhook(
        @Param('tenantId') tenantId: string,
        @Body() body: { name: string; url: string; events: string[]; secret?: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.url || !body.events?.length) {
            throw new HttpException(
                'Name, URL, and events are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const webhook = await this.notificationService.registerWebhook(
                tenantSchema,
                body.name,
                body.url,
                body.events,
                body.secret,
            );
            return {
                success: true,
                data: webhook,
                message: 'Webhook registered successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to register webhook: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get webhooks
     */
    @Get(':tenantId/webhooks')
    async getWebhooks(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const webhooks = await this.notificationService.getWebhooks(tenantSchema);
            return {
                success: true,
                data: webhooks,
                count: webhooks.length,
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get webhooks: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Delete webhook
     */
    @Delete(':tenantId/webhooks/:webhookId')
    async deleteWebhook(
        @Param('tenantId') tenantId: string,
        @Param('webhookId') webhookId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.notificationService.deleteWebhook(
                tenantSchema,
                parseInt(webhookId, 10),
            );
            return {
                success: true,
                message: 'Webhook deleted',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to delete webhook: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Test webhook (manual trigger)
     */
    @Post(':tenantId/webhooks/test')
    async testWebhook(
        @Param('tenantId') tenantId: string,
        @Body() body: { event: string; payload: any },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.notificationService.triggerWebhooks(
                tenantSchema,
                body.event,
                body.payload,
            );
            return {
                success: true,
                message: 'Webhook test triggered',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to trigger webhook: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
