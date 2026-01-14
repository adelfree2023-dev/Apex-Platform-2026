/**
 * Booking System Service
 * Appointments, Services, and Time Slots
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ServiceData {
    name: string;
    description?: string;
    duration: number;  // minutes
    price: number;
    category?: string;
}

export interface BookingData {
    customerId: number;
    serviceId: number;
    date: string;
    timeSlot: string;
    notes?: string;
}

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create booking tables
     */
    async createBookingTables(tenantSchema: string): Promise<void> {
        // Services catalog
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_service" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration INT NOT NULL,
        price INT NOT NULL,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Bookings
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_booking" (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL,
        service_id INT REFERENCES "${tenantSchema}"."vendure_service"(id),
        booking_date DATE NOT NULL,
        time_slot VARCHAR(10) NOT NULL,
        end_time VARCHAR(10),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        confirmed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Business hours
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_business_hours" (
        id SERIAL PRIMARY KEY,
        day_of_week INT NOT NULL,
        open_time VARCHAR(10) NOT NULL,
        close_time VARCHAR(10) NOT NULL,
        is_closed BOOLEAN DEFAULT false,
        UNIQUE(day_of_week)
      )
    `);

        // Insert default business hours (Sun-Thu 9AM-5PM)
        const defaultHours = [
            { day: 0, open: '09:00', close: '17:00', closed: true },  // Sunday
            { day: 1, open: '09:00', close: '17:00', closed: false }, // Monday
            { day: 2, open: '09:00', close: '17:00', closed: false }, // Tuesday
            { day: 3, open: '09:00', close: '17:00', closed: false }, // Wednesday
            { day: 4, open: '09:00', close: '17:00', closed: false }, // Thursday
            { day: 5, open: '09:00', close: '14:00', closed: false }, // Friday
            { day: 6, open: '09:00', close: '17:00', closed: true },  // Saturday
        ];

        for (const h of defaultHours) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_business_hours" (day_of_week, open_time, close_time, is_closed)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (day_of_week) DO NOTHING
      `, h.day, h.open, h.close, h.closed);
        }

        // Insert default services
        const defaultServices = [
            { name: 'Consultation', desc: '30-minute consultation session', duration: 30, price: 15000, cat: 'General' },
            { name: 'Standard Service', desc: '1-hour service session', duration: 60, price: 30000, cat: 'General' },
            { name: 'Premium Service', desc: '2-hour premium session', duration: 120, price: 50000, cat: 'Premium' },
        ];

        for (const s of defaultServices) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_service" (name, description, duration, price, category)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, s.name, s.desc, s.duration, s.price, s.cat);
        }
    }

    /**
     * Get all services
     */
    async getServices(tenantSchema: string): Promise<any[]> {
        try {
            const services = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_service"
        WHERE is_active = true
        ORDER BY category, price ASC
      `);

            return (services as any[]).map(s => ({
                id: Number(s.id),
                name: s.name,
                description: s.description,
                duration: Number(s.duration),
                price: Number(s.price),
                category: s.category,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Create service
     */
    async createService(tenantSchema: string, data: ServiceData): Promise<any> {
        const result = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_service" (name, description, duration, price, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, data.name, data.description || null, data.duration, data.price, data.category || null);

        const s = (result as any[])[0];
        return {
            id: Number(s.id),
            name: s.name,
            duration: Number(s.duration),
            price: Number(s.price),
        };
    }

    /**
     * Get available time slots for a date
     */
    async getAvailableSlots(tenantSchema: string, date: string, serviceId: number): Promise<string[]> {
        const d = new Date(date);
        const dayOfWeek = d.getDay();

        // Get business hours
        const hours = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_business_hours"
      WHERE day_of_week = $1
    `, dayOfWeek);

        if ((hours as any[]).length === 0 || (hours as any[])[0].is_closed) {
            return [];
        }

        const h = (hours as any[])[0];
        const openTime = h.open_time;
        const closeTime = h.close_time;

        // Get service duration
        const service = await this.prisma.$queryRawUnsafe(`
      SELECT duration FROM "${tenantSchema}"."vendure_service"
      WHERE id = $1
    `, serviceId);

        const duration = (service as any[])[0]?.duration || 60;

        // Generate all slots
        const allSlots = this.generateTimeSlots(openTime, closeTime, duration);

        // Get booked slots for the date
        const booked = await this.prisma.$queryRawUnsafe(`
      SELECT time_slot FROM "${tenantSchema}"."vendure_booking"
      WHERE booking_date = $1 AND status NOT IN ('cancelled')
    `, date);

        const bookedSlots = (booked as any[]).map(b => b.time_slot);

        // Filter available
        return allSlots.filter(slot => !bookedSlots.includes(slot));
    }

    /**
     * Generate time slots
     */
    private generateTimeSlots(openTime: string, closeTime: string, duration: number): string[] {
        const slots: string[] = [];
        const [openHour, openMin] = openTime.split(':').map(Number);
        const [closeHour, closeMin] = closeTime.split(':').map(Number);

        let currentMinutes = openHour * 60 + openMin;
        const endMinutes = closeHour * 60 + closeMin - duration;

        while (currentMinutes <= endMinutes) {
            const hour = Math.floor(currentMinutes / 60);
            const min = currentMinutes % 60;
            slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
            currentMinutes += duration;
        }

        return slots;
    }

    /**
     * Create booking
     */
    async createBooking(tenantSchema: string, data: BookingData): Promise<any> {
        // Check availability
        const slots = await this.getAvailableSlots(tenantSchema, data.date, data.serviceId);
        if (!slots.includes(data.timeSlot)) {
            throw new Error('Time slot not available');
        }

        // Get service for end time calculation
        const service = await this.prisma.$queryRawUnsafe(`
      SELECT duration FROM "${tenantSchema}"."vendure_service"
      WHERE id = $1
    `, data.serviceId);

        const duration = (service as any[])[0]?.duration || 60;
        const [hour, min] = data.timeSlot.split(':').map(Number);
        const endMinutes = hour * 60 + min + duration;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        const booking = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_booking" 
      (customer_id, service_id, booking_date, time_slot, end_time, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, data.customerId, data.serviceId, data.date, data.timeSlot, endTime, data.notes || null);

        return this.getBooking(tenantSchema, Number((booking as any[])[0].id));
    }

    /**
     * Get booking by ID
     */
    async getBooking(tenantSchema: string, bookingId: number): Promise<any | null> {
        try {
            const booking = await this.prisma.$queryRawUnsafe(`
        SELECT b.*, s.name as service_name, s.duration, s.price
        FROM "${tenantSchema}"."vendure_booking" b
        JOIN "${tenantSchema}"."vendure_service" s ON s.id = b.service_id
        WHERE b.id = $1
      `, bookingId);

            if ((booking as any[]).length === 0) return null;

            return this.serializeBooking((booking as any[])[0]);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get customer bookings
     */
    async getCustomerBookings(tenantSchema: string, customerId: number): Promise<any[]> {
        try {
            const bookings = await this.prisma.$queryRawUnsafe(`
        SELECT b.*, s.name as service_name, s.duration, s.price
        FROM "${tenantSchema}"."vendure_booking" b
        JOIN "${tenantSchema}"."vendure_service" s ON s.id = b.service_id
        WHERE b.customer_id = $1
        ORDER BY b.booking_date DESC, b.time_slot DESC
      `, customerId);

            return (bookings as any[]).map(b => this.serializeBooking(b));
        } catch (error) {
            return [];
        }
    }

    /**
     * Get all bookings (admin)
     */
    async getAllBookings(tenantSchema: string, date?: string, status?: string): Promise<any[]> {
        try {
            let whereClause = '1=1';
            if (date) whereClause += ` AND b.booking_date = '${date}'`;
            if (status) whereClause += ` AND b.status = '${status}'`;

            const bookings = await this.prisma.$queryRawUnsafe(`
        SELECT b.*, s.name as service_name, s.duration, s.price
        FROM "${tenantSchema}"."vendure_booking" b
        JOIN "${tenantSchema}"."vendure_service" s ON s.id = b.service_id
        WHERE ${whereClause}
        ORDER BY b.booking_date ASC, b.time_slot ASC
      `);

            return (bookings as any[]).map(b => this.serializeBooking(b));
        } catch (error) {
            return [];
        }
    }

    /**
     * Confirm booking
     */
    async confirmBooking(tenantSchema: string, bookingId: number): Promise<any> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_booking"
      SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, bookingId);

        return this.getBooking(tenantSchema, bookingId);
    }

    /**
     * Cancel booking
     */
    async cancelBooking(tenantSchema: string, bookingId: number): Promise<any> {
        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_booking"
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, bookingId);

        return this.getBooking(tenantSchema, bookingId);
    }

    /**
     * Get business hours
     */
    async getBusinessHours(tenantSchema: string): Promise<any[]> {
        try {
            const hours = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_business_hours"
        ORDER BY day_of_week
      `);

            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            return (hours as any[]).map(h => ({
                dayOfWeek: Number(h.day_of_week),
                dayName: dayNames[h.day_of_week],
                openTime: h.open_time,
                closeTime: h.close_time,
                isClosed: h.is_closed,
            }));
        } catch (error) {
            return [];
        }
    }

    private serializeBooking(b: any): any {
        return {
            id: Number(b.id),
            customerId: Number(b.customer_id),
            serviceId: Number(b.service_id),
            serviceName: b.service_name,
            duration: Number(b.duration),
            price: Number(b.price),
            date: b.booking_date,
            timeSlot: b.time_slot,
            endTime: b.end_time,
            status: b.status,
            notes: b.notes,
            confirmedAt: b.confirmed_at,
            cancelledAt: b.cancelled_at,
            createdAt: b.created_at,
        };
    }
}
