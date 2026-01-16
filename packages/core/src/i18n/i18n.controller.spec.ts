/**
 * I18n Controller Unit Tests
 * Covers: Translations, Product Translations, SMS
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { I18nController } from './i18n.controller';
import { I18nService } from './i18n.service';
import { SmsService } from './sms.service';

describe('I18nController', () => {
    let controller: I18nController;

    const mockI18nService = {
        createI18nTables: jest.fn(),
        getTranslation: jest.fn(),
        getAllTranslations: jest.fn(),
        setTranslation: jest.fn(),
        translateProduct: jest.fn(),
        setProductTranslation: jest.fn(),
    };

    const mockSmsService = {
        sendSms: jest.fn(),
        sendTemplatedSms: jest.fn(),
        getTemplates: jest.fn(),
        getSmsHistory: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [I18nController],
            providers: [
                { provide: I18nService, useValue: mockI18nService },
                { provide: SmsService, useValue: mockSmsService },
            ],
        }).compile();

        controller = module.get<I18nController>(I18nController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateI18n', () => {
        it('should create i18n tables', async () => {
            mockI18nService.createI18nTables.mockResolvedValue(undefined);

            const result = await controller.migrateI18n('test-store');

            expect(result.success).toBe(true);
        });

        it('should handle migration errors', async () => {
            mockI18nService.createI18nTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateI18n('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== TRANSLATIONS ====================

    describe('getTranslation', () => {
        it('should return translation for key', async () => {
            mockI18nService.getTranslation.mockResolvedValue('مرحباً');

            const result = await controller.getTranslation('test-store', 'greeting', 'ar');

            expect(result.success).toBe(true);
            expect(result.value).toBe('مرحباً');
        });

        it('should use default language (en)', async () => {
            mockI18nService.getTranslation.mockResolvedValue('Hello');

            const result = await controller.getTranslation('test-store', 'greeting', 'en');

            expect(mockI18nService.getTranslation).toHaveBeenCalledWith(
                'tenant_test_store',
                'en',
                'greeting'
            );
        });
    });

    describe('getAllTranslations', () => {
        it('should return all translations for language', async () => {
            mockI18nService.getAllTranslations.mockResolvedValue({
                greeting: 'مرحباً',
                goodbye: 'مع السلامة',
            });

            const result = await controller.getAllTranslations('test-store', 'ar');

            expect(result.success).toBe(true);
            expect(result.data.greeting).toBe('مرحباً');
        });

        it('should return empty object on error', async () => {
            mockI18nService.getAllTranslations.mockRejectedValue(new Error());

            const result = await controller.getAllTranslations('test-store', 'ar');

            expect(result.data).toEqual({});
        });
    });

    describe('setTranslation', () => {
        it('should set translation', async () => {
            mockI18nService.setTranslation.mockResolvedValue(undefined);

            const result = await controller.setTranslation('test-store', {
                key: 'greeting',
                lang: 'ar',
                value: 'مرحباً',
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved');
        });

        it('should throw without key', async () => {
            await expect(controller.setTranslation('test-store', {
                key: '',
                lang: 'ar',
                value: 'Test',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without value', async () => {
            await expect(controller.setTranslation('test-store', {
                key: 'test',
                lang: 'ar',
                value: '',
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== PRODUCT TRANSLATIONS ====================

    describe('getProductTranslation', () => {
        it('should return product translation', async () => {
            mockI18nService.translateProduct.mockResolvedValue({
                name: 'آيفون 15',
                description: 'أحدث هاتف من أبل',
            });

            const result = await controller.getProductTranslation('test-store', '100', 'ar');

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('آيفون 15');
        });

        it('should return empty on error', async () => {
            mockI18nService.translateProduct.mockRejectedValue(new Error());

            const result = await controller.getProductTranslation('test-store', '100', 'ar');

            expect(result.data).toEqual({});
        });
    });

    describe('setProductTranslation', () => {
        it('should set product translation', async () => {
            mockI18nService.setProductTranslation.mockResolvedValue(undefined);

            const result = await controller.setProductTranslation('test-store', '100', {
                lang: 'ar',
                name: 'آيفون 15',
                description: 'أحدث هاتف من أبل',
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved');
        });

        it('should throw without name', async () => {
            await expect(controller.setProductTranslation('test-store', '100', {
                lang: 'ar',
                name: '',
                description: 'Test',
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== SMS ====================

    describe('sendSms', () => {
        it('should send SMS', async () => {
            mockSmsService.sendSms.mockResolvedValue({
                messageId: 'msg-123',
                status: 'sent',
            });

            const result = await controller.sendSms('test-store', {
                phone: '+201234567890',
                message: 'Your order has shipped',
            });

            expect(result.success).toBe(true);
        });

        it('should throw without phone', async () => {
            await expect(controller.sendSms('test-store', {
                phone: '',
                message: 'Test',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without message', async () => {
            await expect(controller.sendSms('test-store', {
                phone: '+201234567890',
                message: '',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('sendTemplatedSms', () => {
        it('should send templated SMS', async () => {
            mockSmsService.sendTemplatedSms.mockResolvedValue({
                messageId: 'msg-456',
                status: 'sent',
            });

            const result = await controller.sendTemplatedSms('test-store', {
                phone: '+201234567890',
                template: 'order_shipped',
                variables: { orderNumber: '1001', trackingNumber: 'TRK123' },
            });

            expect(result.success).toBe(true);
        });

        it('should throw without template', async () => {
            await expect(controller.sendTemplatedSms('test-store', {
                phone: '+201234567890',
                template: '',
                variables: {},
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getSmsTemplates', () => {
        it('should return SMS templates', async () => {
            mockSmsService.getTemplates.mockResolvedValue([
                { name: 'order_shipped', content: 'Your order {orderNumber} has shipped' },
                { name: 'order_delivered', content: 'Order {orderNumber} delivered' },
            ]);

            const result = await controller.getSmsTemplates('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockSmsService.getTemplates.mockRejectedValue(new Error());

            const result = await controller.getSmsTemplates('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('getCustomerSmsHistory', () => {
        it('should return customer SMS history', async () => {
            mockSmsService.getSmsHistory.mockResolvedValue([
                { id: 1, message: 'Order shipped', timestamp: new Date() },
                { id: 2, message: 'Order delivered', timestamp: new Date() },
            ]);

            const result = await controller.getCustomerSmsHistory('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should return empty on error', async () => {
            mockSmsService.getSmsHistory.mockRejectedValue(new Error());

            const result = await controller.getCustomerSmsHistory('test-store', '100');

            expect(result.data).toEqual([]);
        });
    });
});
