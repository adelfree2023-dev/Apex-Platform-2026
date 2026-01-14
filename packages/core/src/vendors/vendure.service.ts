/**
 * Vendure Service
 * Manages Vendure e-commerce operations per tenant
 * 
 * Per APEX_PLATFORM_CONTEXT.md:
 * - Each tenant's Vendure instance operates on its own schema
 * - Complete isolation of products, orders, customers
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { createVendureConfig, getTenantDatabaseUrl, TenantVendureConfig } from './vendure.config';

export interface TenantContext {
    tenantId: string;
    tenantSchema: string;
    territory: string;
    businessType: string;
    tenantName: string;
}

export interface ProductInput {
    name: string;
    slug: string;
    description?: string;
    price: number;
    sku?: string;
    cooperativeEligible?: boolean;
    qualityScore?: number;
    specializationTags?: string[];
}

@Injectable()
export class VendureService implements OnModuleInit {
    private readonly logger = new Logger(VendureService.name);
    private tenantConfigs: Map<string, TenantVendureConfig> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventService: EventService,
    ) { }

    async onModuleInit() {
        this.logger.log('VendureService initialized');
    }

    /**
     * Initialize Vendure for a new tenant
     * Creates the schema tables and default configuration
     */
    async initializeTenant(context: TenantContext): Promise<void> {
        const { tenantId, tenantSchema, territory, businessType } = context;

        this.logger.log(`Initializing Vendure for tenant: ${tenantId}`);

        // Store tenant config
        const config: TenantVendureConfig = {
            tenantId,
            tenantSchema,
            territory,
            businessType,
        };
        this.tenantConfigs.set(tenantId, config);

        // Create Vendure tables in tenant schema
        await this.createVendureTables(tenantSchema);

        // Create default channel for tenant
        await this.createDefaultChannel(tenantId, tenantSchema, context.tenantName);

        // Log event
        await this.eventService.record({
            type: 'vendure.initialized',
            tenantId,
            territory,
            businessType,
            payload: {
                tenantSchema,
                timestamp: new Date().toISOString(),
            },
        });

        this.logger.log(`Vendure initialized for tenant: ${tenantId}`);
    }

    /**
     * Create Vendure tables in tenant schema
     */
    private async createVendureTables(tenantSchema: string): Promise<void> {
        // Create essential Vendure tables
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_channel" (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) NOT NULL UNIQUE,
        token VARCHAR(255) NOT NULL UNIQUE,
        default_language_code VARCHAR(10) DEFAULT 'en',
        currency_code VARCHAR(10) DEFAULT 'USD',
        price_includes_tax BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_product" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        enabled BOOLEAN DEFAULT true,
        cooperative_eligible BOOLEAN DEFAULT false,
        quality_score FLOAT DEFAULT 0,
        replenishment_lead_time INT DEFAULT 0,
        specialization_tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_product_variant" (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES "${tenantSchema}"."vendure_product"(id),
        sku VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        price INT NOT NULL,
        stock_on_hand INT DEFAULT 0,
        track_inventory BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_order" (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) NOT NULL UNIQUE,
        state VARCHAR(50) DEFAULT 'AddingItems',
        customer_id INT,
        subtotal INT DEFAULT 0,
        shipping INT DEFAULT 0,
        total INT DEFAULT 0,
        territory VARCHAR(255),
        fulfillment_type VARCHAR(50) DEFAULT 'single',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_order_line" (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES "${tenantSchema}"."vendure_order"(id),
        product_variant_id INT,
        quantity INT NOT NULL,
        unit_price INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_customer" (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    }

    /**
     * Create default channel for tenant
     */
    private async createDefaultChannel(tenantId: string, tenantSchema: string, tenantName: string): Promise<void> {
        const channelCode = tenantId.replace(/-/g, '_');
        const token = `${channelCode}_${Date.now()}`;

        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_channel" (code, token, default_language_code, currency_code)
      VALUES ('${channelCode}', '${token}', 'en', 'EGP')
      ON CONFLICT (code) DO NOTHING
    `);
    }

    /**
     * Get products for a tenant
     */
    async getProducts(tenantSchema: string): Promise<any[]> {
        const products = await this.prisma.$queryRawUnsafe(`
      SELECT p.*, pv.sku, pv.price, pv.stock_on_hand
      FROM "${tenantSchema}"."vendure_product" p
      LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
      WHERE p.enabled = true
      ORDER BY p.created_at DESC
    `);
        return products as any[];
    }

    /**
     * Create a product for a tenant
     */
    async createProduct(tenantSchema: string, input: ProductInput): Promise<any> {
        // Create product
        const product = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_product" (name, slug, description, cooperative_eligible, quality_score, specialization_tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, input.name, input.slug, input.description || '', input.cooperativeEligible || false, input.qualityScore || 0, input.specializationTags || []);

        // Create default variant
        const productId = (product as any[])[0].id;
        await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_product_variant" (product_id, sku, name, price, stock_on_hand)
      VALUES ($1, $2, $3, $4, 0)
    `, productId, input.sku || `SKU-${productId}`, input.name, Math.round(input.price * 100));

        return (product as any[])[0];
    }

    /**
     * Get orders for a tenant
     */
    async getOrders(tenantSchema: string): Promise<any[]> {
        const orders = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_order"
      ORDER BY created_at DESC
      LIMIT 100
    `);
        return orders as any[];
    }

    /**
     * Create an order for a tenant
     */
    async createOrder(tenantSchema: string, customerId: number, territory: string): Promise<any> {
        const orderCode = `ORD-${Date.now()}`;
        const order = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_order" (code, customer_id, territory)
      VALUES ($1, $2, $3)
      RETURNING *
    `, orderCode, customerId, territory);

        return (order as any[])[0];
    }

    /**
     * Get tenant configuration
     */
    getTenantConfig(tenantId: string): TenantVendureConfig | undefined {
        return this.tenantConfigs.get(tenantId);
    }

    /**
     * Get Shop API URL for tenant
     */
    getShopApiUrl(tenantId: string): string {
        return `/shop-api/${tenantId}`;
    }

    /**
     * Get Admin API URL for tenant
     */
    getAdminApiUrl(tenantId: string): string {
        return `/admin-api/${tenantId}`;
    }
}
