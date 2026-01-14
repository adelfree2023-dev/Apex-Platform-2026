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

    describe('createI18nTables', () => {
        it('should create i18n tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createI18nTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getTranslations', () => {
        it('should return translations for locale', async () => {
            const mockTranslations = [
                { key: 'welcome', value: 'مرحباً' },
                { key: 'products', value: 'المنتجات' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockTranslations);

            const result = await service.getTranslations('tenant_test', 'ar');

            expect(Object.keys(result).length).toBeGreaterThan(0);
        });
    });

    describe('setTranslation', () => {
        it('should set a translation', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.setTranslation('tenant_test', 'ar', 'hello', 'مرحبا');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getAvailableLocales', () => {
        it('should return available locales', async () => {
            const mockLocales = [
                { code: 'en', name: 'English' },
                { code: 'ar', name: 'Arabic' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockLocales);

            const result = await service.getAvailableLocales('tenant_test');

            expect(result.length).toBe(2);
        });
    });
});
