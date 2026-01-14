/**
 * Booking Controller
 * API endpoints for booking system
 */

import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { BookingService, ServiceData, BookingData } from './booking.service';

@Controller('api/shop')
export class BookingController {
    constructor(private readonly bookingService: BookingService) { }

    /**
     * Migrate booking tables
     */
    @Post(':tenantId/migrate-bookings')
    async migrateBookings(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.bookingService.createBookingTables(tenantSchema);
            return {
                success: true,
                message: 'Booking tables created with default services and hours',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== SERVICES ====================

    /**
     * Get all services
     */
    @Get(':tenantId/bookings/services')
    async getServices(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const services = await this.bookingService.getServices(tenantSchema);
            return {
                success: true,
                data: services,
                count: services.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Create service
     */
    @Post(':tenantId/bookings/services')
    async createService(
        @Param('tenantId') tenantId: string,
        @Body() body: ServiceData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.duration || !body.price) {
            throw new HttpException('Name, duration, and price are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const service = await this.bookingService.createService(tenantSchema, body);
            return {
                success: true,
                data: service,
                message: 'Service created',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create service: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== AVAILABILITY ====================

    /**
     * Get available time slots
     */
    @Get(':tenantId/bookings/slots')
    async getAvailableSlots(
        @Param('tenantId') tenantId: string,
        @Query('date') date: string,
        @Query('serviceId') serviceId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!date || !serviceId) {
            throw new HttpException('Date and service ID are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const slots = await this.bookingService.getAvailableSlots(
                tenantSchema,
                date,
                parseInt(serviceId, 10),
            );
            return {
                success: true,
                data: slots,
                count: slots.length,
                date,
            };
        } catch (error) {
            return { success: true, data: [], count: 0, date };
        }
    }

    /**
     * Get business hours
     */
    @Get(':tenantId/bookings/hours')
    async getBusinessHours(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const hours = await this.bookingService.getBusinessHours(tenantSchema);
            return {
                success: true,
                data: hours,
            };
        } catch (error) {
            return { success: true, data: [] };
        }
    }

    // ==================== BOOKINGS ====================

    /**
     * Create booking
     */
    @Post(':tenantId/bookings')
    async createBooking(
        @Param('tenantId') tenantId: string,
        @Body() body: BookingData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.customerId || !body.serviceId || !body.date || !body.timeSlot) {
            throw new HttpException(
                'Customer ID, service ID, date, and time slot are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const booking = await this.bookingService.createBooking(tenantSchema, body);
            return {
                success: true,
                data: booking,
                message: 'Booking created successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Booking failed: ${error}`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Get customer bookings
     */
    @Get(':tenantId/customers/:customerId/bookings')
    async getCustomerBookings(
        @Param('tenantId') tenantId: string,
        @Param('customerId') customerId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const bookings = await this.bookingService.getCustomerBookings(
                tenantSchema,
                parseInt(customerId, 10),
            );
            return {
                success: true,
                data: bookings,
                count: bookings.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get all bookings (admin)
     */
    @Get(':tenantId/bookings')
    async getAllBookings(
        @Param('tenantId') tenantId: string,
        @Query('date') date?: string,
        @Query('status') status?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const bookings = await this.bookingService.getAllBookings(tenantSchema, date, status);
            return {
                success: true,
                data: bookings,
                count: bookings.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Get booking details
     */
    @Get(':tenantId/bookings/:bookingId')
    async getBooking(
        @Param('tenantId') tenantId: string,
        @Param('bookingId') bookingId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const booking = await this.bookingService.getBooking(
                tenantSchema,
                parseInt(bookingId, 10),
            );
            return {
                success: true,
                data: booking,
                found: !!booking,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Confirm booking
     */
    @Put(':tenantId/bookings/:bookingId/confirm')
    async confirmBooking(
        @Param('tenantId') tenantId: string,
        @Param('bookingId') bookingId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const booking = await this.bookingService.confirmBooking(
                tenantSchema,
                parseInt(bookingId, 10),
            );
            return {
                success: true,
                data: booking,
                message: 'Booking confirmed',
            };
        } catch (error) {
            throw new HttpException(
                `Confirmation failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Cancel booking
     */
    @Delete(':tenantId/bookings/:bookingId')
    async cancelBooking(
        @Param('tenantId') tenantId: string,
        @Param('bookingId') bookingId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const booking = await this.bookingService.cancelBooking(
                tenantSchema,
                parseInt(bookingId, 10),
            );
            return {
                success: true,
                data: booking,
                message: 'Booking cancelled',
            };
        } catch (error) {
            throw new HttpException(
                `Cancellation failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
