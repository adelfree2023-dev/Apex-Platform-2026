/**
 * Booking Controller Unit Tests
 * Covers: Services, Slots, Bookings, Confirmation/Cancellation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

describe('BookingController', () => {
    let controller: BookingController;

    const mockBookingService = {
        createBookingTables: jest.fn(),
        getServices: jest.fn(),
        createService: jest.fn(),
        getAvailableSlots: jest.fn(),
        getBusinessHours: jest.fn(),
        createBooking: jest.fn(),
        getCustomerBookings: jest.fn(),
        getAllBookings: jest.fn(),
        getBooking: jest.fn(),
        confirmBooking: jest.fn(),
        cancelBooking: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BookingController],
            providers: [
                { provide: BookingService, useValue: mockBookingService },
            ],
        }).compile();

        controller = module.get<BookingController>(BookingController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateBookings', () => {
        it('should create booking tables', async () => {
            mockBookingService.createBookingTables.mockResolvedValue(undefined);

            const result = await controller.migrateBookings('test-store');

            expect(result.success).toBe(true);
        });
    });

    // ==================== SERVICES ====================

    describe('getServices', () => {
        it('should return all services', async () => {
            mockBookingService.getServices.mockResolvedValue([
                { id: 1, name: 'Haircut', duration: 30 },
                { id: 2, name: 'Massage', duration: 60 },
            ]);

            const result = await controller.getServices('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('createService', () => {
        it('should create a service', async () => {
            mockBookingService.createService.mockResolvedValue({ id: 1, name: 'Haircut' });

            const result = await controller.createService('test-store', {
                name: 'Haircut',
                duration: 30,
                price: 100,
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Haircut');
        });

        it('should throw without name', async () => {
            await expect(controller.createService('test-store', {
                name: '',
                duration: 30,
                price: 100,
            })).rejects.toThrow(HttpException);
        });
    });

    // ==================== SLOTS ====================

    describe('getAvailableSlots', () => {
        it('should return available time slots', async () => {
            mockBookingService.getAvailableSlots.mockResolvedValue([
                { time: '09:00', available: true },
                { time: '10:00', available: true },
            ]);

            const result = await controller.getAvailableSlots('test-store', '2026-01-20', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should throw without date', async () => {
            await expect(controller.getAvailableSlots('test-store', '', '1'))
                .rejects.toThrow(HttpException);
        });
    });

    describe('getBusinessHours', () => {
        it('should return business hours', async () => {
            mockBookingService.getBusinessHours.mockResolvedValue({
                monday: { open: '09:00', close: '18:00' },
            });

            const result = await controller.getBusinessHours('test-store');

            expect(result.success).toBe(true);
        });
    });

    // ==================== BOOKINGS ====================

    describe('createBooking', () => {
        it('should create a booking', async () => {
            mockBookingService.createBooking.mockResolvedValue({
                id: 1,
                status: 'pending',
            });

            const result = await controller.createBooking('test-store', {
                customerId: 1,
                serviceId: 1,
                date: '2026-01-20',
                time: '10:00',
            });

            expect(result.success).toBe(true);
            expect(result.data.status).toBe('pending');
        });

        it('should throw without required fields', async () => {
            await expect(controller.createBooking('test-store', {
                customerId: undefined as any,
                serviceId: 1,
                date: '2026-01-20',
                time: '10:00',
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getCustomerBookings', () => {
        it('should return customer bookings', async () => {
            mockBookingService.getCustomerBookings.mockResolvedValue([
                { id: 1, date: '2026-01-20' },
            ]);

            const result = await controller.getCustomerBookings('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('getAllBookings', () => {
        it('should return all bookings', async () => {
            mockBookingService.getAllBookings.mockResolvedValue([
                { id: 1 }, { id: 2 },
            ]);

            const result = await controller.getAllBookings('test-store');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should filter by date', async () => {
            mockBookingService.getAllBookings.mockResolvedValue([{ id: 1 }]);

            const result = await controller.getAllBookings('test-store', '2026-01-20');

            expect(result.success).toBe(true);
        });
    });

    describe('getBooking', () => {
        it('should return booking by ID', async () => {
            mockBookingService.getBooking.mockResolvedValue({ id: 1, status: 'confirmed' });

            const result = await controller.getBooking('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data.status).toBe('confirmed');
        });

        it('should handle not found', async () => {
            mockBookingService.getBooking.mockResolvedValue(null);

            await expect(controller.getBooking('test-store', '999'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== CONFIRM/CANCEL ====================

    describe('confirmBooking', () => {
        it('should confirm a booking', async () => {
            mockBookingService.confirmBooking.mockResolvedValue({ id: 1, status: 'confirmed' });

            const result = await controller.confirmBooking('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data.status).toBe('confirmed');
        });
    });

    describe('cancelBooking', () => {
        it('should cancel a booking', async () => {
            mockBookingService.cancelBooking.mockResolvedValue({ id: 1, status: 'cancelled' });

            const result = await controller.cancelBooking('test-store', '1');

            expect(result.success).toBe(true);
            expect(result.data.status).toBe('cancelled');
        });
    });
});
