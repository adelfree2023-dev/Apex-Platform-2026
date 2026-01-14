/**
 * Booking Service Unit Tests
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

            // Should create 3 tables (services, bookings, business_hours)
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledTimes(3);
        });
    });

    describe('getServices', () => {
        it('should return list of services', async () => {
            const mockServices = [
                { id: 1, name: 'Consultation', duration_minutes: 30, price: 15000 },
                { id: 2, name: 'Standard', duration_minutes: 60, price: 30000 },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockServices);

            const result = await service.getServices('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Consultation');
            expect(result[1].durationMinutes).toBe(60);
        });

        it('should return empty array if no services', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getServices('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('getAvailableSlots', () => {
        it('should return available time slots for a date', async () => {
            const mockService = [{ id: 1, duration_minutes: 30 }];
            const mockBookings: any[] = [];
            const mockHours = [{ day_of_week: 1, open_time: '09:00', close_time: '17:00' }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockService)
                .mockResolvedValueOnce(mockBookings)
                .mockResolvedValueOnce(mockHours);

            // Monday date
            const result = await service.getAvailableSlots('tenant_test', '2026-01-20', 1);

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('time');
            expect(result[0]).toHaveProperty('available');
        });

        it('should exclude already booked slots', async () => {
            const mockService = [{ id: 1, duration_minutes: 30 }];
            const mockBookings = [
                { time_slot: '10:00', status: 'confirmed' },
                { time_slot: '14:00', status: 'pending' },
            ];
            const mockHours = [{ day_of_week: 1, open_time: '09:00', close_time: '17:00' }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockService)
                .mockResolvedValueOnce(mockBookings)
                .mockResolvedValueOnce(mockHours);

            const result = await service.getAvailableSlots('tenant_test', '2026-01-20', 1);

            const slot10 = result.find(s => s.time === '10:00');
            const slot14 = result.find(s => s.time === '14:00');

            expect(slot10?.available).toBe(false);
            expect(slot14?.available).toBe(false);
        });
    });

    describe('createBooking', () => {
        it('should create a booking successfully', async () => {
            const mockService = [{ id: 1, duration_minutes: 30 }];
            const mockExisting: any[] = [];
            const mockBooking = [{ id: 1, customer_id: 123, service_id: 1 }];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockService)
                .mockResolvedValueOnce(mockExisting)
                .mockResolvedValueOnce(mockBooking);

            const result = await service.createBooking('tenant_test', {
                customerId: 123,
                serviceId: 1,
                date: '2026-01-20',
                timeSlot: '10:00',
            });

            expect(result.success).toBe(true);
            expect(result.id).toBe(1);
        });

        it('should fail if slot is already booked', async () => {
            const mockService = [{ id: 1, duration_minutes: 30 }];
            const mockExisting = [{ id: 99 }]; // Already booked

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockService)
                .mockResolvedValueOnce(mockExisting);

            await expect(service.createBooking('tenant_test', {
                customerId: 123,
                serviceId: 1,
                date: '2026-01-20',
                timeSlot: '10:00',
            })).rejects.toThrow('Slot already booked');
        });
    });

    describe('confirmBooking', () => {
        it('should confirm a pending booking', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ id: 1, status: 'confirmed' }]);

            const result = await service.confirmBooking('tenant_test', 1);

            expect(result.status).toBe('confirmed');
        });
    });

    describe('cancelBooking', () => {
        it('should cancel a booking', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.cancelBooking('tenant_test', 1);

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });
});
