/**
 * Notification Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
    let service: NotificationService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createNotificationTables', () => {
        it('should create notification tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createNotificationTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('sendNotification', () => {
        it('should send a notification', async () => {
            const mockNotif = [{
                id: 1, customer_id: 123, title: 'Welcome',
                message: 'Welcome to our store!', type: 'info',
                is_read: false, created_at: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockNotif);

            const result = await service.sendNotification('tenant_test', {
                customerId: 123,
                title: 'Welcome',
                message: 'Welcome to our store!',
                type: 'info',
            });

            expect(result.id).toBe(1);
            expect(result.title).toBe('Welcome');
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

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.markAsRead('tenant_test', 1);

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

    describe('getUnreadCount', () => {
        it('should return unread count', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: 5 }]);

            const result = await service.getUnreadCount('tenant_test', 123);

            expect(result).toBe(5);
        });
    });

    describe('deleteNotification', () => {
        it('should delete a notification', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.deleteNotification('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
});
