/**
 * Booking Service Unit Tests — FIXED
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
                { id: 1, name: 'Consultation', duration_minutes: 30, price: 15000, is_active: true },
                { id: 2, name: 'Standard', duration_minutes: 60, price: 30000, is_active: true },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockServices);

            const result = await service.getServices('tenant_test');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Consultation');
        });

        it('should return empty array if no services', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getServices('tenant_test');

            expect(result).toEqual([]);
        });
    });

    describe('createBooking', () => {
        it('should create a booking successfully', async () => {
            const mockService = [{ id: 1, duration_minutes: 30 }];
            const mockExisting: any[] = [];
            const mockBooking = [{ id: 1, customer_id: 123, service_id: 1, status: 'pending' }];

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

            expect(result.id).toBe(1);
        });

        it('should fail if service not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            await expect(service.createBooking('tenant_test', {
                customerId: 123,
                serviceId: 999,
                date: '2026-01-20',
                timeSlot: '10:00',
            })).rejects.toThrow();
        });
    });

    describe('getAllBookings', () => {
        it('should return all bookings', async () => {
            const mockBookings = [
                { id: 1, customer_id: 123, service_id: 1, booking_date: new Date(), time_slot: '10:00', status: 'confirmed', service_name: 'Consultation' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockBookings);

            const result = await service.getAllBookings('tenant_test');

            expect(result).toHaveLength(1);
        });
    });

    describe('getCustomerBookings', () => {
        it('should return customer bookings', async () => {
            const mockBookings = [
                { id: 1, customer_id: 123, service_id: 1, booking_date: new Date(), time_slot: '10:00', status: 'confirmed', service_name: 'Consultation' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockBookings);

            const result = await service.getCustomerBookings('tenant_test', 123);

            expect(result).toHaveLength(1);
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

    describe('getBusinessHours', () => {
        it('should return business hours', async () => {
            const mockHours = [
                { day_of_week: 1, open_time: '09:00', close_time: '17:00' },
                { day_of_week: 2, open_time: '09:00', close_time: '17:00' },
            ];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockHours);

            const result = await service.getBusinessHours('tenant_test');

            expect(result).toHaveLength(2);
        });
    });
});
