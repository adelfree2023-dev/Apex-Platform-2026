/**
 * Shipping Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ShippingService', () => {
    let service: ShippingService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShippingService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<ShippingService>(ShippingService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createShippingTables', () => {
        it('should create shipping tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createShippingTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getShippingZones', () => {
        it('should return shipping zones', async () => {
            const mockZones = [
                { id: 1, name: 'Cairo', countries: ['EG'] },
                { id: 2, name: 'International', countries: ['US', 'UK'] },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZones);

            const result = await service.getShippingZones('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('getShippingMethods', () => {
        it('should return shipping methods for zone', async () => {
            const mockMethods = [
                { id: 1, name: 'Standard', price: 5000, estimated_days: 5 },
                { id: 2, name: 'Express', price: 10000, estimated_days: 2 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockMethods);

            const result = await service.getShippingMethods('tenant_test', 1);

            expect(result.length).toBe(2);
        });
    });

    describe('calculateShipping', () => {
        it('should calculate shipping cost', async () => {
            const mockMethod = [{
                id: 1, name: 'Standard', base_price: 5000,
                price_per_kg: 1000, free_shipping_threshold: 50000,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockMethod);

            const result = await service.calculateShipping('tenant_test', {
                methodId: 1,
                weight: 2,
                orderTotal: 30000,
            });

            expect(result.cost).toBeGreaterThan(0);
        });

        it('should return free shipping above threshold', async () => {
            const mockMethod = [{
                id: 1, name: 'Standard', base_price: 5000,
                price_per_kg: 1000, free_shipping_threshold: 50000,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockMethod);

            const result = await service.calculateShipping('tenant_test', {
                methodId: 1,
                weight: 2,
                orderTotal: 60000,
            });

            expect(result.cost).toBe(0);
            expect(result.freeShipping).toBe(true);
        });
    });

    describe('createShipment', () => {
        it('should create a shipment', async () => {
            const mockShipment = [{
                id: 1, order_id: 100, tracking_number: 'TRK123',
                status: 'pending', carrier: 'DHL',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockShipment);

            const result = await service.createShipment('tenant_test', {
                orderId: 100,
                carrier: 'DHL',
            });

            expect(result.trackingNumber).toBeDefined();
        });
    });

    describe('updateShipmentStatus', () => {
        it('should update shipment status', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.updateShipmentStatus('tenant_test', 1, 'shipped');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
});
