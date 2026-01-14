/**
 * RFQ Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RfqService } from './rfq.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RfqService', () => {
    let service: RfqService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RfqService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<RfqService>(RfqService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createRfqTables', () => {
        it('should create RFQ tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createRfqTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('createRfq', () => {
        it('should create a new RFQ', async () => {
            const mockRfq = [{
                id: 1, customer_name: 'John', customer_email: 'john@test.com',
                status: 'pending', created_at: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockRfq);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.createRfq('tenant_test', {
                customerName: 'John',
                customerEmail: 'john@test.com',
                items: [{ productId: 1, quantity: 100 }],
            });

            expect(result.customerName).toBe('John');
        });
    });

    describe('getRfq', () => {
        it('should return RFQ by ID', async () => {
            const mockRfq = [{
                id: 1, customer_name: 'John', customer_email: 'john@test.com',
                status: 'pending', created_at: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockRfq);

            const result = await service.getRfq('tenant_test', 1);

            expect(result).not.toBeNull();
            expect(result.id).toBe(1);
        });

        it('should return null if not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getRfq('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    describe('getRfqs', () => {
        it('should return all RFQs', async () => {
            const mockRfqs = [
                { id: 1, customer_name: 'John', status: 'pending', created_at: new Date() },
                { id: 2, customer_name: 'Jane', status: 'quoted', created_at: new Date() },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockRfqs);

            const result = await service.getRfqs('tenant_test');

            expect(result).toHaveLength(2);
        });

        it('should filter by status', async () => {
            const mockRfqs = [{ id: 1, customer_name: 'John', status: 'pending', created_at: new Date() }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockRfqs);

            const result = await service.getRfqs('tenant_test', 'pending');

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('pending');
        });
    });

    describe('getWholesaleTiers', () => {
        it('should return wholesale tiers', async () => {
            const mockTiers = [
                { id: 1, name: 'Bronze', min_order: 1000, discount_percent: 5 },
                { id: 2, name: 'Silver', min_order: 5000, discount_percent: 10 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockTiers);

            const result = await service.getWholesaleTiers('tenant_test');

            expect(result).toHaveLength(2);
        });
    });

    describe('getWholesalePrice', () => {
        it('should apply wholesale discount for approved customer', async () => {
            // Mock: customer with tier
            const mockCustomer = [{ tier_name: 'Bronze', discount_percentage: 10 }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce(mockCustomer);

            const result = await service.getWholesalePrice('tenant_test', 123, 10000, 10);

            expect(result.discount).toBe(10);
            expect(result.discountedPrice).toBe(9000); // 10% off
            expect(result.tier).toBe('Bronze');
        });

        it('should return original price if not wholesale customer', async () => {
            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce([]) // No approved customer
                .mockResolvedValueOnce([]); // No tier match

            const result = await service.getWholesalePrice('tenant_test', 123, 10000, 5);

            expect(result.discount).toBe(0);
            expect(result.discountedPrice).toBe(10000);
        });
    });

    describe('applyForWholesale', () => {
        it('should create wholesale application', async () => {
            const mockResult = [{ id: 1 }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

            const result = await service.applyForWholesale('tenant_test', 123);

            expect(result.success).toBe(true);
        });
    });
});
