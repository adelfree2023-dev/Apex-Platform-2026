/**
 * SMS Service Unit Tests
 * Root-analyzed: SMS notifications with templates
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SmsService } from './sms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SmsService', () => {
    let service: SmsService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SmsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SmsService>(SmsService);
        jest.clearAllMocks();
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== CREATE SMS TABLE ====================

    describe('createSmsTable', () => {
        it('should create SMS log and template tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createSmsTable('tenant_test_store');

            // Should create sms_log and sms_template tables
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });

        it('should insert default templates', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createSmsTable('tenant_test_store');

            // Verify default templates are inserted (4 templates)
            const insertCalls = mockPrismaService.$executeRawUnsafe.mock.calls.filter(
                call => call[0].includes('INSERT INTO') && call[0].includes('sms_template')
            );
            expect(insertCalls.length).toBeGreaterThan(0);
        });
    });

    // ==================== SEND SMS ====================

    describe('sendSms', () => {
        it('should send SMS and return success', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1),
                phone_number: '+201234567890',
                status: 'sent',
            }]);

            const result = await service.sendSms('tenant_test_store', {
                to: '+201234567890',
                message: 'Test message',
                type: 'general',
            });

            expect(result.success).toBe(true);
            expect(result.phone).toBe('+201234567890');
        });

        it('should send SMS with customer ID', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: BigInt(1),
            }]);

            await service.sendSms('tenant_test_store', {
                to: '+201234567890',
                message: 'Order confirmed',
                type: 'order',
            }, 100);

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
                expect.any(String),
                100,
                '+201234567890',
                'Order confirmed',
                'order'
            );
        });

        it('should throw error on database failure', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'));

            await expect(service.sendSms('tenant_test_store', {
                to: '+201234567890',
                message: 'Test',
            })).rejects.toThrow('DB Error');
        });
    });

    // ==================== GET TEMPLATE ====================

    describe('getTemplate', () => {
        it('should return English template', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                template: 'Your order #{order_code} has been confirmed.',
            }]);

            const result = await service.getTemplate('tenant_test_store', 'order_confirmation', 'en');

            expect(result).toBe('Your order #{order_code} has been confirmed.');
        });

        it('should return Arabic template', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                template: 'تم تأكيد طلبك #{order_code}',
            }]);

            const result = await service.getTemplate('tenant_test_store', 'order_confirmation', 'ar');

            expect(result).toContain('تم تأكيد');
        });

        it('should return null for non-existent template', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getTemplate('tenant_test_store', 'unknown_template');

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('Error'));

            const result = await service.getTemplate('tenant_test_store', 'order_confirmation');

            expect(result).toBeNull();
        });
    });

    // ==================== SEND TEMPLATED SMS ====================

    describe('sendTemplatedSms', () => {
        it('should send SMS with template variables replaced', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ template: 'Your order #{order_code} is confirmed. Total: {total}' }])
                .mockResolvedValueOnce([{ id: BigInt(1) }]);

            const result = await service.sendTemplatedSms(
                'tenant_test_store',
                '+201234567890',
                'order_confirmation',
                { order_code: 'ORD-123', total: '500 جنيه' },
                'en',
                100
            );

            expect(result.success).toBe(true);
        });

        it('should throw error for non-existent template', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(
                service.sendTemplatedSms('tenant_test_store', '+201234567890', 'unknown', {})
            ).rejects.toThrow('Template unknown not found');
        });
    });

    // ==================== GET SMS HISTORY ====================

    describe('getSmsHistory', () => {
        it('should return SMS history for customer', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { id: BigInt(1), phone_number: '+201234567890', message: 'Order confirmed', message_type: 'order', status: 'sent', sent_at: new Date() },
                { id: BigInt(2), phone_number: '+201234567890', message: 'Order shipped', message_type: 'order', status: 'sent', sent_at: new Date() },
            ]);

            const result = await service.getSmsHistory('tenant_test_store', 100);

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('phone');
            expect(result[0]).toHaveProperty('message');
            expect(result[0]).toHaveProperty('type');
        });

        it('should return empty array for customer with no SMS', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getSmsHistory('tenant_test_store', 999);

            expect(result).toEqual([]);
        });
    });

    // ==================== GET TEMPLATES ====================

    describe('getTemplates', () => {
        it('should return all active SMS templates', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([
                { id: BigInt(1), name: 'order_confirmation', template_en: 'En text', template_ar: 'Ar text', type: 'order' },
                { id: BigInt(2), name: 'otp_verification', template_en: 'OTP: {otp}', template_ar: 'كود: {otp}', type: 'otp' },
            ]);

            const result = await service.getTemplates('tenant_test_store');

            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('templateEn');
            expect(result[0]).toHaveProperty('templateAr');
        });
    });
});
