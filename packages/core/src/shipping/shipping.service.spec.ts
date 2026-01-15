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
                { id: 1, name: 'Cairo', regions: ['EG'], rate: 5000 },
                { id: 2, name: 'International', regions: ['US', 'UK'], rate: 10000 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZones);

            const result = await service.getShippingZones('tenant_test');

            expect(result.length).toBe(2);
        });
    });

    describe('calculateShipping', () => {
        it('should calculate shipping cost', async () => {
            const mockZone = [{
                id: 1, name: 'Cairo', rate: 5000,
                min_order_for_free: 50000, estimated_days: 3,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZone);

            // calculateShipping(tenantSchema, region, orderTotal)
            const result = await service.calculateShipping('tenant_test', 'Cairo', 30000);

            expect(result.rate).toBe(5000);
            expect(result.freeShipping).toBe(false);
        });

        it('should return free shipping above threshold', async () => {
            const mockZone = [{
                id: 1, name: 'Cairo', rate: 5000,
                min_order_for_free: 50000, estimated_days: 3,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZone);

            const result = await service.calculateShipping('tenant_test', 'Cairo', 60000);

            expect(result.rate).toBe(0);
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

            // createShipment(tenantSchema, orderId, carrier, trackingNumber)
            const result = await service.createShipment('tenant_test', 100, 'DHL', 'TRK123');

            expect(result.trackingNumber).toBe('TRK123');
        });
    });

    describe('updateShipmentStatus', () => {
        it('should update shipment status', async () => {
            const mockUpdated = [{ id: 1, status: 'shipped' }];
            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockUpdated);

            const result = await service.updateShipmentStatus('tenant_test', 1, 'shipped');

            expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
        });
    });
});

