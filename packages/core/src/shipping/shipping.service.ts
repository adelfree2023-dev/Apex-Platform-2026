/**
 * Shipping Service
 * Handles shipping zones, rates, and delivery tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ShippingZoneData {
    name: string;
    regions: string[];  // e.g., ["maadi", "zamalek", "heliopolis"]
    rate: number;       // in cents
    minOrderForFree?: number;  // Minimum order for free shipping
    estimatedDays: number;
}

export interface TrackingUpdate {
    status: string;
    location?: string;
    description?: string;
}

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create shipping tables
     */
    async createShippingTables(tenantSchema: string): Promise<void> {
        // Shipping zones table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_shipping_zone" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        regions TEXT[] NOT NULL,
        rate INT NOT NULL,
        min_order_for_free INT,
        estimated_days INT DEFAULT 3,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Shipments table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_shipment" (
        id SERIAL PRIMARY KEY,
        order_id INT,
        carrier VARCHAR(100),
        tracking_number VARCHAR(255),
        tracking_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'processing',
        shipped_at TIMESTAMP,
        delivered_at TIMESTAMP,
        estimated_delivery TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Tracking history table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_tracking_history" (
        id SERIAL PRIMARY KEY,
        shipment_id INT,
        status VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        description TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

        // Insert default shipping zones for Egypt
        const defaultZones = [
            { name: 'Cairo - Central', regions: ['maadi', 'zamalek', 'garden-city', 'downtown', 'heliopolis'], rate: 2500, estimatedDays: 1 },
            { name: 'Cairo - Suburbs', regions: ['nasr-city', '6th-october', 'new-cairo', 'tagamoa'], rate: 3500, estimatedDays: 2 },
            { name: 'Alexandria', regions: ['alexandria', 'smouha', 'stanley', 'san-stefano'], rate: 5000, estimatedDays: 3 },
            { name: 'Delta', regions: ['tanta', 'mansoura', 'damanhour', 'zagazig'], rate: 6000, estimatedDays: 4 },
            { name: 'Upper Egypt', regions: ['luxor', 'aswan', 'sohag', 'qena'], rate: 8000, estimatedDays: 5 },
        ];

        for (const zone of defaultZones) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_shipping_zone" (name, regions, rate, estimated_days)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, zone.name, zone.regions, zone.rate, zone.estimatedDays);
        }
    }

    /**
     * Get all shipping zones
     */
    async getShippingZones(tenantSchema: string): Promise<any[]> {
        try {
            const zones = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_shipping_zone"
        WHERE is_active = true
        ORDER BY rate ASC
      `);

            return (zones as any[]).map(z => ({
                id: Number(z.id),
                name: z.name,
                regions: z.regions,
                rate: Number(z.rate),
                minOrderForFree: z.min_order_for_free ? Number(z.min_order_for_free) : null,
                estimatedDays: Number(z.estimated_days),
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Calculate shipping rate for region
     */
    async calculateShipping(tenantSchema: string, region: string, orderTotal: number): Promise<any> {
        try {
            const zone = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_shipping_zone"
        WHERE $1 = ANY(regions) AND is_active = true
        LIMIT 1
      `, region.toLowerCase());

            if ((zone as any[]).length === 0) {
                // Default rate for unknown regions
                return {
                    found: false,
                    zone: null,
                    rate: 10000, // 100 EGP default
                    estimatedDays: 7,
                    freeShipping: false,
                };
            }

            const z = (zone as any[])[0];
            const rate = Number(z.rate);
            const minForFree = z.min_order_for_free ? Number(z.min_order_for_free) : null;
            const freeShipping = minForFree && orderTotal >= minForFree;

            return {
                found: true,
                zone: {
                    id: Number(z.id),
                    name: z.name,
                },
                rate: freeShipping ? 0 : rate,
                originalRate: rate,
                estimatedDays: Number(z.estimated_days),
                freeShipping,
                freeShippingThreshold: minForFree,
            };
        } catch (error) {
            return { found: false, rate: 10000, estimatedDays: 7 };
        }
    }

    /**
     * Create shipping zone
     */
    async createShippingZone(tenantSchema: string, data: ShippingZoneData): Promise<any> {
        const result = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_shipping_zone" (name, regions, rate, min_order_for_free, estimated_days)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, data.name, data.regions, data.rate, data.minOrderForFree || null, data.estimatedDays);

        return this.serializeZone((result as any[])[0]);
    }

    /**
     * Create shipment for order
     */
    async createShipment(tenantSchema: string, orderId: number, carrier: string, trackingNumber: string): Promise<any> {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 3); // 3 days estimate

        const result = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_shipment" 
      (order_id, carrier, tracking_number, status, shipped_at, estimated_delivery)
      VALUES ($1, $2, $3, 'shipped', NOW(), $4)
      RETURNING *
    `, orderId, carrier, trackingNumber, estimatedDelivery);

        const shipment = (result as any[])[0];

        // Add initial tracking entry
        await this.addTrackingUpdate(tenantSchema, Number(shipment.id), {
            status: 'shipped',
            description: 'Package has been shipped',
        });

        return this.serializeShipment(shipment);
    }

    /**
     * Get shipment by order
     */
    async getShipmentByOrder(tenantSchema: string, orderId: number): Promise<any | null> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_shipment"
        WHERE order_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, orderId);

            const shipment = (result as any[])[0];
            if (!shipment) return null;

            return this.serializeShipment(shipment);
        } catch (error) {
            return null;
        }
    }

    /**
     * Update shipment status
     */
    async updateShipmentStatus(tenantSchema: string, shipmentId: number, status: string): Promise<any> {
        const deliveredAt = status === 'delivered' ? 'NOW()' : 'NULL';

        await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_shipment"
      SET status = $1, delivered_at = ${status === 'delivered' ? 'NOW()' : 'delivered_at'}, updated_at = NOW()
      WHERE id = $2
    `, status, shipmentId);

        return { success: true, status };
    }

    /**
     * Add tracking update
     */
    async addTrackingUpdate(tenantSchema: string, shipmentId: number, update: TrackingUpdate): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_tracking_history" 
      (shipment_id, status, location, description)
      VALUES ($1, $2, $3, $4)
    `, shipmentId, update.status, update.location || null, update.description || null);

        // Update shipment status
        await this.updateShipmentStatus(tenantSchema, shipmentId, update.status);
    }

    /**
     * Get tracking history
     */
    async getTrackingHistory(tenantSchema: string, shipmentId: number): Promise<any[]> {
        try {
            const history = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_tracking_history"
        WHERE shipment_id = $1
        ORDER BY timestamp DESC
      `, shipmentId);

            return (history as any[]).map(h => ({
                id: Number(h.id),
                status: h.status,
                location: h.location,
                description: h.description,
                timestamp: h.timestamp,
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Track by tracking number
     */
    async trackByNumber(tenantSchema: string, trackingNumber: string): Promise<any | null> {
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT s.*, o.code as order_code
        FROM "${tenantSchema}"."vendure_shipment" s
        LEFT JOIN "${tenantSchema}"."vendure_order" o ON o.id = s.order_id
        WHERE s.tracking_number = $1
        LIMIT 1
      `, trackingNumber);

            const shipment = (result as any[])[0];
            if (!shipment) return null;

            const history = await this.getTrackingHistory(tenantSchema, Number(shipment.id));

            return {
                ...this.serializeShipment(shipment),
                orderCode: shipment.order_code,
                history,
            };
        } catch (error) {
            return null;
        }
    }

    private serializeZone(z: any): any {
        return {
            id: Number(z.id),
            name: z.name,
            regions: z.regions,
            rate: Number(z.rate),
            minOrderForFree: z.min_order_for_free ? Number(z.min_order_for_free) : null,
            estimatedDays: Number(z.estimated_days),
        };
    }

    private serializeShipment(s: any): any {
        return {
            id: Number(s.id),
            orderId: Number(s.order_id),
            carrier: s.carrier,
            trackingNumber: s.tracking_number,
            trackingUrl: s.tracking_url,
            status: s.status,
            shippedAt: s.shipped_at,
            deliveredAt: s.delivered_at,
            estimatedDelivery: s.estimated_delivery,
            createdAt: s.created_at,
        };
    }
}
