/**
 * Shipping Service Unit Tests
 * Tests all actual methods in ShippingService
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
        it('should create shipping tables and insert default zones', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createShippingTables('tenant_test');

            // Should create 3 tables + 5 default zones = 8+ calls
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getShippingZones', () => {
        it('should return all active shipping zones', async () => {
            const mockZones = [
                { id: 1, name: 'Cairo - Central', regions: ['maadi', 'zamalek'], rate: 2500, min_order_for_free: null, estimated_days: 1 },
                { id: 2, name: 'Alexandria', regions: ['alexandria'], rate: 5000, min_order_for_free: 50000, estimated_days: 3 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZones);

            const result = await service.getShippingZones('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Cairo - Central');
            expect(result[0].rate).toBe(2500);
            expect(result[1].minOrderForFree).toBe(50000);
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'));

            const result = await service.getShippingZones('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('calculateShipping', () => {
        it('should calculate shipping for known region', async () => {
            const mockZone = [{
                id: 1, name: 'Cairo - Central',
                rate: 2500, min_order_for_free: 50000, estimated_days: 1,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZone);

            // calculateShipping(tenantSchema, region, orderTotal)
            const result = await service.calculateShipping('tenant_test', 'maadi', 30000);

            expect(result.found).toBe(true);
            expect(result.rate).toBe(2500);
            expect(result.freeShipping).toBe(false);
            expect(result.estimatedDays).toBe(1);
        });

        it('should return free shipping when order exceeds threshold', async () => {
            const mockZone = [{
                id: 1, name: 'Cairo - Central',
                rate: 2500, min_order_for_free: 50000, estimated_days: 1,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockZone);

            const result = await service.calculateShipping('tenant_test', 'maadi', 60000);

            expect(result.found).toBe(true);
            expect(result.rate).toBe(0); // Free!
            expect(result.freeShipping).toBe(true);
            expect(result.originalRate).toBe(2500);
        });

        it('should return default rate for unknown region', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.calculateShipping('tenant_test', 'unknown-region', 30000);

            expect(result.found).toBe(false);
            expect(result.rate).toBe(10000); // Default 100 EGP
            expect(result.estimatedDays).toBe(7);
        });
    });

    describe('createShippingZone', () => {
        it('should create a new shipping zone', async () => {
            const mockCreated = [{
                id: 10, name: 'New Zone', regions: ['area1', 'area2'],
                rate: 4000, min_order_for_free: 100000, estimated_days: 2,
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockCreated);

            const result = await service.createShippingZone('tenant_test', {
                name: 'New Zone',
                regions: ['area1', 'area2'],
                rate: 4000,
                minOrderForFree: 100000,
                estimatedDays: 2,
            });

            expect(result.id).toBe(10);
            expect(result.name).toBe('New Zone');
            expect(result.rate).toBe(4000);
        });
    });

    describe('createShipment', () => {
        it('should create a shipment with tracking', async () => {
            const mockShipment = [{
                id: 1, order_id: 100, carrier: 'DHL',
                tracking_number: 'TRK123456', status: 'shipped',
                shipped_at: new Date(), estimated_delivery: new Date(),
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockShipment);
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            // createShipment(tenantSchema, orderId, carrier, trackingNumber)
            const result = await service.createShipment('tenant_test', 100, 'DHL', 'TRK123456');

            expect(result.orderId).toBe(100);
            expect(result.carrier).toBe('DHL');
            expect(result.trackingNumber).toBe('TRK123456');
            expect(result.status).toBe('shipped');
        });
    });

    describe('getShipmentByOrder', () => {
        it('should return shipment for order', async () => {
            const mockShipment = [{
                id: 1, order_id: 100, carrier: 'DHL',
                tracking_number: 'TRK123', status: 'shipped',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockShipment);

            const result = await service.getShipmentByOrder('tenant_test', 100);

            expect(result).not.toBeNull();
            expect(result!.orderId).toBe(100);
        });

        it('should return null if no shipment exists', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getShipmentByOrder('tenant_test', 999);

            expect(result).toBeNull();
        });
    });

    describe('updateShipmentStatus', () => {
        it('should update shipment status', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            const result = await service.updateShipmentStatus('tenant_test', 1, 'delivered');

            expect(result.success).toBe(true);
            expect(result.status).toBe('delivered');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getTrackingHistory', () => {
        it('should return tracking history for shipment', async () => {
            const mockHistory = [
                { id: 1, status: 'shipped', location: 'Cairo', description: 'Package shipped', timestamp: new Date() },
                { id: 2, status: 'in-transit', location: 'Giza', description: 'In transit', timestamp: new Date() },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockHistory);

            const result = await service.getTrackingHistory('tenant_test', 1);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe('shipped');
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'));

            const result = await service.getTrackingHistory('tenant_test', 999);

            expect(result).toEqual([]);
        });
    });

    describe('trackByNumber', () => {
        it('should track shipment by tracking number', async () => {
            const mockShipment = [{
                id: 1, order_id: 100, carrier: 'DHL',
                tracking_number: 'TRK123', status: 'in-transit',
                order_code: 'ORD-001',
            }];
            const mockHistory = [
                { id: 1, status: 'shipped', location: 'Cairo', description: 'Shipped', timestamp: new Date() },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockShipment)
                .mockResolvedValueOnce(mockHistory);

            const result = await service.trackByNumber('tenant_test', 'TRK123');

            expect(result).not.toBeNull();
            expect(result!.trackingNumber).toBe('TRK123');
            expect(result!.history).toHaveLength(1);
        });

        it('should return null for unknown tracking number', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.trackByNumber('tenant_test', 'UNKNOWN');

            expect(result).toBeNull();
        });
    });
});
