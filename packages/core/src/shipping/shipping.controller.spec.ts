/**
 * Shipping Controller Unit Tests
 * Covers: Zones, Rates, Shipments, Tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

describe('ShippingController', () => {
    let controller: ShippingController;

    const mockShippingService = {
        createShippingTables: jest.fn(),
        getShippingZones: jest.fn(),
        calculateShipping: jest.fn(),
        createShippingZone: jest.fn(),
        createShipment: jest.fn(),
        getShipmentByOrder: jest.fn(),
        trackByNumber: jest.fn(),
        addTrackingUpdate: jest.fn(),
        getTrackingHistory: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShippingController],
            providers: [
                { provide: ShippingService, useValue: mockShippingService },
            ],
        }).compile();

        controller = module.get<ShippingController>(ShippingController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateShipping', () => {
        it('should create shipping tables', async () => {
            mockShippingService.createShippingTables.mockResolvedValue(undefined);

            const result = await controller.migrateShipping('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Shipping tables created');
            expect(mockShippingService.createShippingTables).toHaveBeenCalledWith('tenant_test_store');
        });

        it('should handle migration errors', async () => {
            mockShippingService.createShippingTables.mockRejectedValue(new Error('Database error'));

            await expect(controller.migrateShipping('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== SHIPPING ZONES ====================

    describe('getShippingZones', () => {
        it('should return all shipping zones', async () => {
            const zones = [
                { id: 1, name: 'Cairo', rate: 25 },
                { id: 2, name: 'Alexandria', rate: 35 },
                { id: 3, name: 'Upper Egypt', rate: 50 },
            ];
            mockShippingService.getShippingZones.mockResolvedValue(zones);

            const result = await controller.getShippingZones('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.count).toBe(3);
        });

        it('should return empty array on error', async () => {
            mockShippingService.getShippingZones.mockRejectedValue(new Error('Error'));

            const result = await controller.getShippingZones('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
        });
    });

    describe('calculateShipping', () => {
        it('should calculate shipping rate', async () => {
            mockShippingService.calculateShipping.mockResolvedValue({
                zone: 'Cairo',
                rate: 25,
                freeShippingThreshold: 500,
                estimatedDays: '2-3',
            });

            const result = await controller.calculateShipping('test-store', 'cairo', '300');

            expect(result.success).toBe(true);
            expect(result.data.rate).toBe(25);
            expect(result.data.estimatedDays).toBe('2-3');
        });

        it('should apply free shipping for large orders', async () => {
            mockShippingService.calculateShipping.mockResolvedValue({
                zone: 'Cairo',
                rate: 0,
                freeShipping: true,
            });

            const result = await controller.calculateShipping('test-store', 'cairo', '600');

            expect(result.data.rate).toBe(0);
            expect(result.data.freeShipping).toBe(true);
        });

        it('should throw without region', async () => {
            await expect(controller.calculateShipping('test-store', '', '100'))
                .rejects.toThrow(HttpException);
        });
    });

    describe('createShippingZone', () => {
        it('should create new shipping zone', async () => {
            mockShippingService.createShippingZone.mockResolvedValue({
                id: 4,
                name: 'Delta',
                regions: ['Mansoura', 'Tanta'],
                rate: 40,
            });

            const result = await controller.createShippingZone('test-store', {
                name: 'Delta',
                regions: ['Mansoura', 'Tanta'],
                rate: 40,
                estimatedDays: 3,
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Delta');
            expect(result.message).toContain('created');
        });

        it('should throw without required fields', async () => {
            await expect(controller.createShippingZone('test-store', {
                name: '',
                regions: [],
                rate: 0,
                estimatedDays: 0,
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== SHIPMENTS ====================

    describe('createShipment', () => {
        it('should create shipment for order', async () => {
            mockShippingService.createShipment.mockResolvedValue({
                id: 1,
                orderId: 100,
                carrier: 'Aramex',
                trackingNumber: 'ARX123456',
                status: 'shipped',
            });

            const result = await controller.createShipment('test-store', '100', {
                carrier: 'Aramex',
                trackingNumber: 'ARX123456',
            });

            expect(result.success).toBe(true);
            expect(result.data.trackingNumber).toBe('ARX123456');
            expect(result.message).toContain('shipped');
        });

        it('should throw without carrier', async () => {
            await expect(controller.createShipment('test-store', '100', {
                carrier: '',
                trackingNumber: 'ARX123',
            })).rejects.toThrow(HttpException);
        });

        it('should throw without tracking number', async () => {
            await expect(controller.createShipment('test-store', '100', {
                carrier: 'Aramex',
                trackingNumber: '',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getShipment', () => {
        it('should return shipment for order', async () => {
            mockShippingService.getShipmentByOrder.mockResolvedValue({
                id: 1,
                status: 'in_transit',
                carrier: 'Aramex',
            });

            const result = await controller.getShipment('test-store', '100');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
            expect(result.data.status).toBe('in_transit');
        });

        it('should return found: false for non-existent shipment', async () => {
            mockShippingService.getShipmentByOrder.mockResolvedValue(null);

            const result = await controller.getShipment('test-store', '999');

            expect(result.success).toBe(true);
            expect(result.found).toBe(false);
        });
    });

    // ==================== TRACKING ====================

    describe('trackShipment', () => {
        it('should track by tracking number', async () => {
            mockShippingService.trackByNumber.mockResolvedValue({
                trackingNumber: 'ARX123456',
                status: 'delivered',
                lastUpdate: new Date(),
            });

            const result = await controller.trackShipment('test-store', 'ARX123456');

            expect(result.success).toBe(true);
            expect(result.found).toBe(true);
            expect(result.data.status).toBe('delivered');
        });

        it('should return found: false for invalid tracking', async () => {
            mockShippingService.trackByNumber.mockResolvedValue(null);

            const result = await controller.trackShipment('test-store', 'INVALID');

            expect(result.found).toBe(false);
        });
    });

    describe('addTrackingUpdate', () => {
        it('should add tracking update', async () => {
            mockShippingService.addTrackingUpdate.mockResolvedValue(undefined);

            const result = await controller.addTrackingUpdate('test-store', '1', {
                status: 'delivered',
                location: 'Cairo Hub',
                description: 'Delivered to customer',
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('Tracking updated');
        });

        it('should throw without status', async () => {
            await expect(controller.addTrackingUpdate('test-store', '1', {
                status: '',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getTrackingHistory', () => {
        it('should return tracking history', async () => {
            mockShippingService.getTrackingHistory.mockResolvedValue([
                { status: 'shipped', timestamp: new Date() },
                { status: 'in_transit', timestamp: new Date() },
                { status: 'delivered', timestamp: new Date() },
            ]);

            const result = await controller.getTrackingHistory('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.count).toBe(3);
        });

        it('should return empty on error', async () => {
            mockShippingService.getTrackingHistory.mockRejectedValue(new Error());

            const result = await controller.getTrackingHistory('test-store', '1');

            expect(result.data).toEqual([]);
        });
    });
});
