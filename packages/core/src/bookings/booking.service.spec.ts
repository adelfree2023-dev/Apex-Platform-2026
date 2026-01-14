/**
 * Booking Service Unit Tests — FIXED v2
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BookingService', () => {
    let service: BookingService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BookingService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<BookingService>(BookingService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createBookingTables', () => {
        it('should create all booking tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.createBookingTables('tenant_test');

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getServices', () => {
        it('should return list of services', async () => {
            const mockServices = [
                { id: 1, name: 'Consultation', description: 'Test', duration: 30, price: 15000, category: 'General', is_active: true },
                { id: 2, name: 'Standard', description: 'Test', duration: 60, price: 30000, category: 'General', is_active: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockServices);

            const result = await service.getServices('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Consultation');
        });

        it('should return empty array on error', async () => {
            mockPrismaService.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));

            const result = await service.getServices('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('createBooking', () => {
        it('should create a booking successfully', async () => {
            // For getAvailableSlots:
            // 1. business hours
            const mockHours = [{ day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false }];
            // 2. service duration
            const mockServiceDuration = [{ duration: 30 }];
            // 3. booked slots (empty)
            const mockBooked: any[] = [];

            // For createBooking:
            // 4. service duration again
            const mockServiceDuration2 = [{ duration: 30 }];
            // 5. create booking
            const mockNewBooking = [{ id: 1 }];
            // 6. getBooking final result
            const mockFinalBooking = [{
                id: 1, customer_id: 123, service_id: 1, service_name: 'Consultation',
                duration: 30, price: 15000, booking_date: '2026-01-20',
                time_slot: '10:00', end_time: '10:30', status: 'pending',
            }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockHours) // getAvailableSlots: business hours
                .mockResolvedValueOnce(mockServiceDuration) // getAvailableSlots: service
                .mockResolvedValueOnce(mockBooked) // getAvailableSlots: booked slots
                .mockResolvedValueOnce(mockServiceDuration2) // createBooking: service
                .mockResolvedValueOnce(mockNewBooking) // createBooking: insert
                .mockResolvedValueOnce(mockFinalBooking); // getBooking

            const result = await service.createBooking('tenant_test', {
                customerId: 123,
                serviceId: 1,
                date: '2026-01-20', // Monday = day 1
                timeSlot: '10:00',
            });

            expect(result).not.toBeNull();
            expect(result.id).toBe(1);
        });

        it('should fail if slot not available', async () => {
            const mockHours = [{ day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false }];
            const mockServiceDuration = [{ duration: 30 }];
            const mockBooked = [{ time_slot: '10:00' }]; // Already booked

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockHours)
                .mockResolvedValueOnce(mockServiceDuration)
                .mockResolvedValueOnce(mockBooked);

            await expect(service.createBooking('tenant_test', {
                customerId: 123,
                serviceId: 1,
                date: '2026-01-20',
                timeSlot: '10:00',
            })).rejects.toThrow('Time slot not available');
        });
    });

    describe('getAvailableSlots', () => {
        it('should return available slots', async () => {
            const mockHours = [{ day_of_week: 1, open_time: '09:00', close_time: '11:00', is_closed: false }];
            const mockService = [{ duration: 30 }];
            const mockBooked: any[] = [];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockHours)
                .mockResolvedValueOnce(mockService)
                .mockResolvedValueOnce(mockBooked);

            const result = await service.getAvailableSlots('tenant_test', '2026-01-20', 1);

            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('09:00');
        });

        it('should return empty if day is closed', async () => {
            const mockHours = [{ day_of_week: 0, open_time: '09:00', close_time: '17:00', is_closed: true }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockHours);

            const result = await service.getAvailableSlots('tenant_test', '2026-01-19', 1); // Sunday

            expect(result).toEqual([]);
        });
    });

    describe('getAllBookings', () => {
        it('should return all bookings', async () => {
            const mockBookings = [{
                id: 1, customer_id: 123, service_id: 1, service_name: 'Consultation',
                duration: 30, price: 15000, booking_date: '2026-01-20',
                time_slot: '10:00', end_time: '10:30', status: 'confirmed',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockBookings);

            const result = await service.getAllBookings('tenant_test');

            expect(result).toHaveLength(1);
        });
    });

    describe('getCustomerBookings', () => {
        it('should return customer bookings', async () => {
            const mockBookings = [{
                id: 1, customer_id: 123, service_id: 1, service_name: 'Consultation',
                duration: 30, price: 15000, booking_date: '2026-01-20',
                time_slot: '10:00', end_time: '10:30', status: 'confirmed',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockBookings);

            const result = await service.getCustomerBookings('tenant_test', 123);

            expect(result).toHaveLength(1);
        });
    });

    describe('confirmBooking', () => {
        it('should confirm a pending booking', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, customer_id: 123, service_id: 1, service_name: 'Consultation',
                duration: 30, price: 15000, booking_date: '2026-01-20',
                time_slot: '10:00', end_time: '10:30', status: 'confirmed',
            }]);

            const result = await service.confirmBooking('tenant_test', 1);

            expect(result.status).toBe('confirmed');
        });
    });

    describe('cancelBooking', () => {
        it('should cancel a booking', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{
                id: 1, customer_id: 123, service_id: 1, service_name: 'Consultation',
                duration: 30, price: 15000, booking_date: '2026-01-20',
                time_slot: '10:00', end_time: '10:30', status: 'cancelled',
            }]);

            const result = await service.cancelBooking('tenant_test', 1);

            expect(result.status).toBe('cancelled');
        });
    });

    describe('getBusinessHours', () => {
        it('should return business hours', async () => {
            const mockHours = [
                { day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false },
                { day_of_week: 2, open_time: '09:00', close_time: '17:00', is_closed: false },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockHours);

            const result = await service.getBusinessHours('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].dayName).toBe('Monday');
        });
    });
});
