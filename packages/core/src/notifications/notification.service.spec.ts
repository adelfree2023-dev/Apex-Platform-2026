/**
 * Notification Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';

describe('NotificationService', () => {
    let service: NotificationService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    const mockEventService = {
        record: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: EventService, useValue: mockEventService },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createNotificationTable', () => {
        it('should create notification table', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createNotificationTable('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('createNotification', () => {
        it('should create a notification', async () => {
            const mockNotif = [{
                id: 1, customer_id: 123, type: 'order',
                title: 'Order Created', message: 'Your order was created',
                is_read: false, created_at: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockNotif);

            const result = await service.createNotification('tenant_test', 123, {
                type: 'order',
                title: 'Order Created',
                message: 'Your order was created',
            });

            expect(result.id).toBe(1);
        });
    });

    describe('getNotifications', () => {
        it('should return customer notifications', async () => {
            const mockNotifs = [
                { id: 1, title: 'Notif 1', is_read: false },
                { id: 2, title: 'Notif 2', is_read: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockNotifs);

            const result = await service.getNotifications('tenant_test', 123);

            expect(result.length).toBe(2);
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread count', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: 5 }]);

            const result = await service.getUnreadCount('tenant_test', 123);

            expect(result).toBe(5);
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1, is_read: true }]);

            const result = await service.markAsRead('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.markAllAsRead('tenant_test', 123);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('registerWebhook', () => {
        it('should register a webhook', async () => {
            const mockWebhook = [{ id: 1, name: 'Test Webhook', url: 'https://example.com' }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockWebhook);

            const result = await service.registerWebhook('tenant_test', 'Test Webhook', 'https://example.com', ['order.created']);

            expect(result.id).toBe(1);
        });
    });

    describe('getWebhooks', () => {
        it('should return webhooks', async () => {
            const mockWebhooks = [{ id: 1, name: 'Webhook 1' }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockWebhooks);

            const result = await service.getWebhooks('tenant_test');

            expect(result.length).toBe(1);
        });
    });

    describe('deleteWebhook', () => {
        it('should delete a webhook', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.deleteWebhook('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
});
