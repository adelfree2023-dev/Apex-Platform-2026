/**
 * I18n Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';
import { PrismaService } from '../prisma/prisma.service';

describe('I18nService', () => {
    let service: I18nService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                I18nService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<I18nService>(I18nService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTranslationTable', () => {
        it('should create translation table', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createTranslationTable('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getTranslation', () => {
        it('should return translation for key', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ value: 'مرحباً' }]);

            const result = await service.getTranslation('tenant_test', 'ar', 'welcome');

            expect(result).toBe('مرحباً');
        });

        it('should return key if translation not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getTranslation('tenant_test', 'ar', 'unknown_key');

            expect(result).toBe('unknown_key');
        });
    });

    describe('getAllTranslations', () => {
        it('should return all translations for locale', async () => {
            const mockTranslations = [
                { key: 'welcome', value: 'مرحباً' },
                { key: 'products', value: 'المنتجات' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockTranslations);

            const result = await service.getAllTranslations('tenant_test', 'ar');

            expect(result['welcome']).toBe('مرحباً');
            expect(result['products']).toBe('المنتجات');
        });

        it('should return empty object on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.getAllTranslations('tenant_test', 'ar');

            expect(result).toEqual({});
        });
    });

    describe('setTranslation', () => {
        it('should set a translation', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.setTranslation('tenant_test', 'ar', 'hello', 'مرحبا');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('translateProduct', () => {
        it('should translate product name and description', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([{ value: 'عسل طبيعي' }])
                .mockResolvedValueOnce([{ value: 'أجود أنواع العسل' }]);

            const result = await service.translateProduct('tenant_test', 1, 'ar');

            expect(result.name).toBe('عسل طبيعي');
            expect(result.description).toBe('أجود أنواع العسل');
        });
    });

    describe('setProductTranslation', () => {
        it('should set product translations', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.setProductTranslation('tenant_test', 1, 'ar', 'منتج', 'وصف المنتج');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(2);
        });
    });
});
