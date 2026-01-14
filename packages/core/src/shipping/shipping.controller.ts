/**
 * Shipping Controller
 * API endpoints for shipping zones, rates, and tracking
 */

import { Controller, Get, Post, Put, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ShippingService, ShippingZoneData, TrackingUpdate } from './shipping.service';

@Controller('api/shop')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    /**
     * Migrate shipping tables
     */
    @Post(':tenantId/migrate-shipping')
    async migrateShipping(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.shippingService.createShippingTables(tenantSchema);
            return {
                success: true,
                message: 'Shipping tables created with default Egypt zones',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== SHIPPING ZONES ====================

    /**
     * Get all shipping zones
     */
    @Get(':tenantId/shipping/zones')
    async getShippingZones(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const zones = await this.shippingService.getShippingZones(tenantSchema);
            return {
                success: true,
                data: zones,
                count: zones.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Calculate shipping rate
     */
    @Get(':tenantId/shipping/calculate')
    async calculateShipping(
        @Param('tenantId') tenantId: string,
        @Query('region') region: string,
        @Query('total') total: string = '0',
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!region) {
            throw new HttpException('Region is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.shippingService.calculateShipping(
                tenantSchema,
                region,
                parseInt(total, 10),
            );
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            throw new HttpException(
                `Calculation failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create shipping zone
     */
    @Post(':tenantId/shipping/zones')
    async createShippingZone(
        @Param('tenantId') tenantId: string,
        @Body() body: ShippingZoneData,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.name || !body.regions || !body.rate) {
            throw new HttpException('Name, regions, and rate are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const zone = await this.shippingService.createShippingZone(tenantSchema, body);
            return {
                success: true,
                data: zone,
                message: 'Shipping zone created',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to create zone: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    // ==================== SHIPMENTS & TRACKING ====================

    /**
     * Create shipment for order
     */
    @Post(':tenantId/orders/:orderId/ship')
    async createShipment(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
        @Body() body: { carrier: string; trackingNumber: string },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.carrier || !body.trackingNumber) {
            throw new HttpException('Carrier and tracking number are required', HttpStatus.BAD_REQUEST);
        }

        try {
            const shipment = await this.shippingService.createShipment(
                tenantSchema,
                parseInt(orderId, 10),
                body.carrier,
                body.trackingNumber,
            );
            return {
                success: true,
                data: shipment,
                message: 'Order shipped successfully',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to ship order: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get shipment for order
     */
    @Get(':tenantId/orders/:orderId/shipment')
    async getShipment(
        @Param('tenantId') tenantId: string,
        @Param('orderId') orderId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const shipment = await this.shippingService.getShipmentByOrder(
                tenantSchema,
                parseInt(orderId, 10),
            );
            return {
                success: true,
                data: shipment,
                found: !!shipment,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Track by tracking number
     */
    @Get(':tenantId/shipping/track/:trackingNumber')
    async trackShipment(
        @Param('tenantId') tenantId: string,
        @Param('trackingNumber') trackingNumber: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const tracking = await this.shippingService.trackByNumber(tenantSchema, trackingNumber);
            return {
                success: true,
                data: tracking,
                found: !!tracking,
            };
        } catch (error) {
            return { success: true, data: null, found: false };
        }
    }

    /**
     * Add tracking update
     */
    @Post(':tenantId/shipments/:shipmentId/tracking')
    async addTrackingUpdate(
        @Param('tenantId') tenantId: string,
        @Param('shipmentId') shipmentId: string,
        @Body() body: TrackingUpdate,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.status) {
            throw new HttpException('Status is required', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.shippingService.addTrackingUpdate(
                tenantSchema,
                parseInt(shipmentId, 10),
                body,
            );
            return {
                success: true,
                message: 'Tracking updated',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to update tracking: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get tracking history
     */
    @Get(':tenantId/shipments/:shipmentId/tracking')
    async getTrackingHistory(
        @Param('tenantId') tenantId: string,
        @Param('shipmentId') shipmentId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const history = await this.shippingService.getTrackingHistory(
                tenantSchema,
                parseInt(shipmentId, 10),
            );
            return {
                success: true,
                data: history,
                count: history.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }
}
