/**
 * Promotions Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PromotionsService', () => {
    let service: PromotionsService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PromotionsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<PromotionsService>(PromotionsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createPromotionTables', () => {
        it('should create promotion tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createPromotionTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('createPromotion', () => {
        it('should create a new promotion', async () => {
            const mockPromo = [{
                id: 1, name: 'Summer Sale', code: 'SUMMER20',
                discount_type: 'percentage', discount_value: 20,
                is_active: true, created_at: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPromo);

            const result = await service.createPromotion('tenant_test', {
                name: 'Summer Sale',
                code: 'SUMMER20',
                discountType: 'percentage',
                discountValue: 20,
            });

            expect(result.name).toBe('Summer Sale');
            expect(result.code).toBe('SUMMER20');
        });
    });

    describe('getPromotions', () => {
        it('should return all active promotions', async () => {
            const mockPromos = [
                { id: 1, name: 'Sale 1', code: 'SALE1', is_active: true },
                { id: 2, name: 'Sale 2', code: 'SALE2', is_active: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPromos);

            const result = await service.getPromotions('tenant_test');

            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('validatePromoCode', () => {
        it('should validate a promo code', async () => {
            const mockPromo = [{
                id: 1, name: 'Test', code: 'TEST10',
                discount_type: 'percentage', discount_value: 10,
                min_order_value: 5000, is_active: true,
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-12-31'),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPromo);

            const result = await service.validatePromoCode('tenant_test', 'TEST10', 10000);

            expect(result.valid).toBe(true);
            expect(result.discount).toBe(10);
        });

        it('should reject invalid promo code', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.validatePromoCode('tenant_test', 'INVALID', 10000);

            expect(result.valid).toBe(false);
        });
    });

    describe('applyPromotion', () => {
        it('should apply promotion to order', async () => {
            const mockPromo = [{
                id: 1, discount_type: 'percentage', discount_value: 10,
                min_order_value: 0, is_active: true,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockPromo);

            const result = await service.applyPromotion('tenant_test', 'TEST10', 10000);

            expect(result.originalAmount).toBe(10000);
            expect(result.discountAmount).toBe(1000);
            expect(result.finalAmount).toBe(9000);
        });
    });

    describe('deletePromotion', () => {
        it('should delete a promotion', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.deletePromotion('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
});
