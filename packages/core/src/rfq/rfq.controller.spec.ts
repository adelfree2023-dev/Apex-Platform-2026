/**
 * RFQ Controller Unit Tests
 * Covers: RFQ CRUD, Wholesale Tiers, Pricing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { RfqController } from './rfq.controller';
import { RfqService } from './rfq.service';

describe('RfqController', () => {
    let controller: RfqController;

    const mockRfqService = {
        createRfqTables: jest.fn(),
        createRfq: jest.fn(),
        getRfqs: jest.fn(),
        getRfq: jest.fn(),
        updateRfq: jest.fn(),
        getWholesaleTiers: jest.fn(),
        getWholesalePrice: jest.fn(),
        applyForWholesale: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RfqController],
            providers: [
                { provide: RfqService, useValue: mockRfqService },
            ],
        }).compile();

        controller = module.get<RfqController>(RfqController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateRfq', () => {
        it('should create RFQ tables', async () => {
            mockRfqService.createRfqTables.mockResolvedValue(undefined);

            const result = await controller.migrateRfq('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('RFQ');
        });

        it('should handle migration errors', async () => {
            mockRfqService.createRfqTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateRfq('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== RFQ CRUD ====================

    describe('createRfq', () => {
        it('should create RFQ request', async () => {
            mockRfqService.createRfq.mockResolvedValue({
                id: 1,
                customerName: 'Ahmed',
                customerEmail: 'ahmed@example.com',
                status: 'pending',
            });

            const result = await controller.createRfq('test-store', {
                customerName: 'Ahmed',
                customerEmail: 'ahmed@example.com',
                items: [{ productId: 1, quantity: 100 }],
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('submitted');
        });

        it('should throw without customerName', async () => {
            await expect(controller.createRfq('test-store', {
                customerName: '',
                customerEmail: 'ahmed@example.com',
                items: [{ productId: 1, quantity: 100 }],
            })).rejects.toThrow(HttpException);
        });

        it('should throw without customerEmail', async () => {
            await expect(controller.createRfq('test-store', {
                customerName: 'Ahmed',
                customerEmail: '',
                items: [{ productId: 1, quantity: 100 }],
            })).rejects.toThrow(HttpException);
        });

        it('should throw without items', async () => {
            await expect(controller.createRfq('test-store', {
                customerName: 'Ahmed',
                customerEmail: 'ahmed@example.com',
                items: [],
            })).rejects.toThrow(HttpException);
        });

        it('should handle creation errors', async () => {
            mockRfqService.createRfq.mockRejectedValue(new Error('Error'));

            await expect(controller.createRfq('test-store', {
                customerName: 'Ahmed',
                customerEmail: 'ahmed@example.com',
                items: [{ productId: 1, quantity: 100 }],
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getRfqs', () => {
        it('should return all RFQs', async () => {
            mockRfqService.getRfqs.mockResolvedValue([
                { id: 1, customerName: 'Ahmed', status: 'pending' },
                { id: 2, customerName: 'Mohamed', status: 'approved' },
            ]);

            const result = await controller.getRfqs('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should filter by status', async () => {
            mockRfqService.getRfqs.mockResolvedValue([]);

            await controller.getRfqs('test-store', 'pending');

            expect(mockRfqService.getRfqs).toHaveBeenCalledWith(
                'tenant_test_store',
                'pending'
            );
        });

        it('should return empty on error', async () => {
            mockRfqService.getRfqs.mockRejectedValue(new Error());

            const result = await controller.getRfqs('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('getRfq', () => {
        it('should return RFQ by ID', async () => {
            mockRfqService.getRfq.mockResolvedValue({
                id: 1,
                customerName: 'Ahmed',
                items: [{ productId: 1, quantity: 100 }],
            });

            const result = await controller.getRfq('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
        });

        it('should return found: false for non-existent', async () => {
            mockRfqService.getRfq.mockResolvedValue(null);

            const result = await controller.getRfq('test-store', '999');

            expect(result.found).toBe(false);
        });
    });

    describe('updateRfq', () => {
        it('should update RFQ', async () => {
            mockRfqService.updateRfq.mockResolvedValue({
                id: 1,
                status: 'approved',
                quotedPrice: 5000,
            });

            const result = await controller.updateRfq('test-store', '1', {
                status: 'approved',
                quotedPrice: 5000,
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('updated');
        });

        it('should handle update errors', async () => {
            mockRfqService.updateRfq.mockRejectedValue(new Error('Error'));

            await expect(controller.updateRfq('test-store', '1', { status: 'approved' }))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== WHOLESALE ====================

    describe('getWholesaleTiers', () => {
        it('should return wholesale tiers', async () => {
            mockRfqService.getWholesaleTiers.mockResolvedValue([
                { name: 'Bronze', minQuantity: 10, discountPercent: 5 },
                { name: 'Silver', minQuantity: 50, discountPercent: 10 },
                { name: 'Gold', minQuantity: 100, discountPercent: 15 },
            ]);

            const result = await controller.getWholesaleTiers('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
        });

        it('should return empty on error', async () => {
            mockRfqService.getWholesaleTiers.mockRejectedValue(new Error());

            const result = await controller.getWholesaleTiers('test-store');

            expect(result.data).toEqual([]);
        });
    });

    describe('getWholesalePrice', () => {
        it('should return wholesale price with discount', async () => {
            mockRfqService.getWholesalePrice.mockResolvedValue({
                originalPrice: 1000,
                discountedPrice: 900,
                discount: 10,
                tier: 'Silver',
            });

            const result = await controller.getWholesalePrice(
                'test-store',
                '100',
                '1000',
                '50'
            );

            expect(result.success).toBe(true);
            expect(result.data.discountedPrice).toBe(900);
        });

        it('should return original price on error', async () => {
            mockRfqService.getWholesalePrice.mockRejectedValue(new Error());

            const result = await controller.getWholesalePrice(
                'test-store',
                '100',
                '1000',
                '5'
            );

            expect(result.data.discount).toBe(0);
            expect(result.data.tier).toBeNull();
        });
    });

    describe('applyForWholesale', () => {
        it('should apply for wholesale', async () => {
            mockRfqService.applyForWholesale.mockResolvedValue({
                applicationId: 1,
                status: 'pending',
            });

            const result = await controller.applyForWholesale('test-store', {
                customerId: 100,
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('submitted');
        });

        it('should throw without customerId', async () => {
            await expect(controller.applyForWholesale('test-store', {
                customerId: undefined as any,
            })).rejects.toThrow(HttpException);
        });

        it('should handle application errors', async () => {
            mockRfqService.applyForWholesale.mockRejectedValue(new Error('Already applied'));

            await expect(controller.applyForWholesale('test-store', {
                customerId: 100,
            })).rejects.toThrow(HttpException);
        });
    });
});
