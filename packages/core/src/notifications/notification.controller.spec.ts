/**
 * Notification Controller Unit Tests
 * Covers: Notifications, Read Status, Webhooks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
    let controller: NotificationController;

    const mockNotificationService = {
        createNotificationTable: jest.fn(),
        getNotifications: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        registerWebhook: jest.fn(),
        getWebhooks: jest.fn(),
        deleteWebhook: jest.fn(),
        triggerWebhooks: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationController],
            providers: [
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compile();

        controller = module.get<NotificationController>(NotificationController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateNotifications', () => {
        it('should create notification tables', async () => {
            mockNotificationService.createNotificationTable.mockResolvedValue(undefined);

            const result = await controller.migrateNotifications('test-store');

            expect(result.success).toBe(true);
        });

        it('should handle errors', async () => {
            mockNotificationService.createNotificationTable.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateNotifications('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== NOTIFICATIONS ====================

    describe('getNotifications', () => {
        it('should return notifications with unread count', async () => {
            mockNotificationService.getNotifications.mockResolvedValue([
                { id: 1, message: 'Order shipped', read: false },
                { id: 2, message: 'Payment received', read: true },
            ]);
            mockNotificationService.getUnreadCount.mockResolvedValue(1);

            const result = await controller.getNotifications('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.unreadCount).toBe(1);
        });

        it('should handle errors', async () => {
            mockNotificationService.getNotifications.mockRejectedValue(new Error('Error'));

            await expect(controller.getNotifications('test-store', '100'))
                .rejects.toThrow(HttpException);
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockNotificationService.markAsRead.mockResolvedValue({ id: 1, read: true });

            const result = await controller.markAsRead('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data.read).toBe(true);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            mockNotificationService.markAllAsRead.mockResolvedValue(undefined);

            const result = await controller.markAllAsRead('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.message).toContain('All notifications');
        });
    });

    // ==================== WEBHOOKS ====================

    describe('registerWebhook', () => {
        it('should register webhook', async () => {
            mockNotificationService.registerWebhook.mockResolvedValue({
                id: 1,
                name: 'Order Webhook',
                url: 'https://api.example.com/webhook',
                events: ['order.created', 'order.shipped'],
            });

            const result = await controller.registerWebhook('test-store', {
                name: 'Order Webhook',
                url: 'https://api.example.com/webhook',
                events: ['order.created', 'order.shipped'],
            });

            expect(result.success).toBe(true);
            expect(result.data.events).toContain('order.created');
        });

        it('should throw without name', async () => {
            await expect(controller.registerWebhook('test-store', {
                name: '',
                url: 'https://api.example.com',
                events: ['order.created'],
            })).rejects.toThrow(HttpException);
        });

        it('should throw without url', async () => {
            await expect(controller.registerWebhook('test-store', {
                name: 'Test',
                url: '',
                events: ['order.created'],
            })).rejects.toThrow(HttpException);
        });

        it('should throw without events', async () => {
            await expect(controller.registerWebhook('test-store', {
                name: 'Test',
                url: 'https://api.example.com',
                events: [],
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getWebhooks', () => {
        it('should return all webhooks', async () => {
            mockNotificationService.getWebhooks.mockResolvedValue([
                { id: 1, name: 'Webhook 1' },
                { id: 2, name: 'Webhook 2' },
            ]);

            const result = await controller.getWebhooks('test-store');

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });
    });

    describe('deleteWebhook', () => {
        it('should delete webhook', async () => {
            mockNotificationService.deleteWebhook.mockResolvedValue(undefined);

            const result = await controller.deleteWebhook('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.message).toContain('deleted');
        });
    });

    describe('testWebhook', () => {
        it('should trigger test webhook', async () => {
            mockNotificationService.triggerWebhooks.mockResolvedValue(undefined);

            const result = await controller.testWebhook('test-store', {
                event: 'order.created',
                payload: { orderId: 123 },
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('triggered');
        });
    });
});
