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

    // Cart tables for Phase 02
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_cart" (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        customer_id INT,
        subtotal INT DEFAULT 0,
        total INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_cart_item" (
        id SERIAL PRIMARY KEY,
        cart_id INT REFERENCES "${tenantSchema}"."vendure_cart"(id) ON DELETE CASCADE,
        product_id INT,
        product_variant_id INT,
        quantity INT NOT NULL DEFAULT 1,
        unit_price INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
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

  // ==================== CART METHODS (Phase 02) ====================

  /**
   * Get or create cart for a session
   */
  async getOrCreateCart(tenantSchema: string, sessionId: string): Promise<any> {
    // Try to find existing cart
    const existingCart = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_cart"
      WHERE session_id = $1
    `, sessionId);

    if ((existingCart as any[]).length > 0) {
      return (existingCart as any[])[0];
    }

    // Create new cart
    const newCart = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_cart" (session_id)
      VALUES ($1)
      RETURNING *
    `, sessionId);

    return (newCart as any[])[0];
  }

  /**
   * Add item to cart
   */
  async addToCart(tenantSchema: string, sessionId: string, productId: number, quantity: number): Promise<any> {
    const cart = await this.getOrCreateCart(tenantSchema, sessionId);

    // Get product price
    const product = await this.prisma.$queryRawUnsafe(`
      SELECT pv.id as variant_id, pv.price, pv.stock_on_hand, p.name
      FROM "${tenantSchema}"."vendure_product" p
      JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
      WHERE p.id = $1
    `, productId);

    if ((product as any[]).length === 0) {
      throw new Error('Product not found');
    }

    const productData = (product as any[])[0];

    // Check if item already in cart
    const existingItem = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_cart_item"
      WHERE cart_id = $1 AND product_id = $2
    `, cart.id, productId);

    if ((existingItem as any[]).length > 0) {
      // Update quantity
      const item = await this.prisma.$queryRawUnsafe(`
        UPDATE "${tenantSchema}"."vendure_cart_item"
        SET quantity = quantity + $1
        WHERE id = $2
        RETURNING *
      `, quantity, (existingItem as any[])[0].id);
      return (item as any[])[0];
    }

    // Add new item
    const cartItem = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_cart_item" 
      (cart_id, product_id, product_variant_id, quantity, unit_price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, cart.id, productId, productData.variant_id, quantity, productData.price);

    // Update cart totals
    await this.updateCartTotals(tenantSchema, cart.id);

    return (cartItem as any[])[0];
  }

  /**
   * Get cart with items
   */
  async getCart(tenantSchema: string, sessionId: string): Promise<any> {
    const cart = await this.getOrCreateCart(tenantSchema, sessionId);

    const items = await this.prisma.$queryRawUnsafe(`
      SELECT ci.*, p.name as product_name, p.slug, pv.sku
      FROM "${tenantSchema}"."vendure_cart_item" ci
      JOIN "${tenantSchema}"."vendure_product" p ON p.id = ci.product_id
      LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.id = ci.product_variant_id
      WHERE ci.cart_id = $1
    `, cart.id);

    return {
      ...cart,
      items: items as any[],
      itemCount: (items as any[]).length,
    };
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(tenantSchema: string, itemId: number, quantity: number): Promise<any> {
    if (quantity <= 0) {
      return this.removeCartItem(tenantSchema, itemId);
    }

    const item = await this.prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_cart_item"
      SET quantity = $1
      WHERE id = $2
      RETURNING *
    `, quantity, itemId);

    if ((item as any[]).length > 0) {
      await this.updateCartTotals(tenantSchema, (item as any[])[0].cart_id);
    }

    return (item as any[])[0];
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(tenantSchema: string, itemId: number): Promise<any> {
    const item = await this.prisma.$queryRawUnsafe(`
      DELETE FROM "${tenantSchema}"."vendure_cart_item"
      WHERE id = $1
      RETURNING *
    `, itemId);

    if ((item as any[]).length > 0) {
      await this.updateCartTotals(tenantSchema, (item as any[])[0].cart_id);
    }

    return { deleted: true };
  }

  /**
   * Update cart totals
   */
  private async updateCartTotals(tenantSchema: string, cartId: number): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_cart"
      SET 
        subtotal = (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM "${tenantSchema}"."vendure_cart_item" WHERE cart_id = $1),
        total = (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM "${tenantSchema}"."vendure_cart_item" WHERE cart_id = $1),
        updated_at = NOW()
      WHERE id = $1
    `, cartId);
  }

  /**
   * Checkout - Create order from cart
   */
  async checkout(tenantSchema: string, sessionId: string, customerEmail: string, territory: string): Promise<any> {
    const cart = await this.getCart(tenantSchema, sessionId);

    if (!cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Create or get customer
    let customer = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_customer"
      WHERE email = $1
    `, customerEmail);

    if ((customer as any[]).length === 0) {
      customer = await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_customer" (email)
        VALUES ($1)
        RETURNING *
      `, customerEmail);
    }

    const customerId = (customer as any[])[0].id;

    // Create order
    const orderCode = `ORD-${Date.now()}`;
    const order = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_order" 
      (code, customer_id, subtotal, total, territory, state)
      VALUES ($1, $2, $3, $4, $5, 'PaymentPending')
      RETURNING *
    `, orderCode, customerId, cart.subtotal, cart.total, territory);

    const orderId = (order as any[])[0].id;

    // Create order lines
    for (const item of cart.items) {
      await this.prisma.$queryRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_order_line"
        (order_id, product_variant_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
      `, orderId, item.product_variant_id, item.quantity, item.unit_price);

      // Deduct inventory
      await this.prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}"."vendure_product_variant"
        SET stock_on_hand = stock_on_hand - $1
        WHERE id = $2
      `, item.quantity, item.product_variant_id);
    }

    // Clear cart
    await this.prisma.$executeRawUnsafe(`
      DELETE FROM "${tenantSchema}"."vendure_cart_item" WHERE cart_id = $1
    `, cart.id);

    await this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_cart"
      SET subtotal = 0, total = 0, updated_at = NOW()
      WHERE id = $1
    `, cart.id);

    return (order as any[])[0];
  }

  /**
   * Get order by ID
   */
  async getOrderById(tenantSchema: string, orderId: number): Promise<any> {
    const order = await this.prisma.$queryRawUnsafe(`
      SELECT o.*, c.email as customer_email
      FROM "${tenantSchema}"."vendure_order" o
      LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = o.customer_id
      WHERE o.id = $1
    `, orderId);

    if ((order as any[]).length === 0) {
      return null;
    }

    const orderLines = await this.prisma.$queryRawUnsafe(`
      SELECT ol.*, p.name as product_name
      FROM "${tenantSchema}"."vendure_order_line" ol
      LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.id = ol.product_variant_id
      LEFT JOIN "${tenantSchema}"."vendure_product" p ON p.id = pv.product_id
      WHERE ol.order_id = $1
    `, orderId);

    return {
      ...(order as any[])[0],
      lines: orderLines as any[],
    };
  }

  // ==================== CATEGORY METHODS (Phase 05) ====================

  /**
   * Create category table (migration)
   */
  async createCategoryTable(tenantSchema: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_category" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        parent_id INT REFERENCES "${tenantSchema}"."vendure_category"(id),
        image_url TEXT,
        sort_order INT DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add category_id to products table
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "${tenantSchema}"."vendure_product"
      ADD COLUMN IF NOT EXISTS category_id INT REFERENCES "${tenantSchema}"."vendure_category"(id)
    `);
  }

  /**
   * Get all categories
   */
  async getCategories(tenantSchema: string): Promise<any[]> {
    const categories = await this.prisma.$queryRawUnsafe(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM "${tenantSchema}"."vendure_product" p WHERE p.category_id = c.id) as product_count
      FROM "${tenantSchema}"."vendure_category" c
      WHERE c.enabled = true
      ORDER BY c.sort_order ASC, c.name ASC
    `);
    return categories as any[];
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(tenantSchema: string, slug: string): Promise<any> {
    const category = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "${tenantSchema}"."vendure_category"
      WHERE slug = $1 AND enabled = true
    `, slug);
    return (category as any[])[0] || null;
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(tenantSchema: string, categorySlug: string): Promise<any[]> {
    const products = await this.prisma.$queryRawUnsafe(`
      SELECT p.*, pv.sku, pv.price, pv.stock_on_hand, c.name as category_name
      FROM "${tenantSchema}"."vendure_product" p
      LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
      LEFT JOIN "${tenantSchema}"."vendure_category" c ON c.id = p.category_id
      WHERE c.slug = $1 AND p.enabled = true
      ORDER BY p.created_at DESC
    `, categorySlug);
    return products as any[];
  }

  /**
   * Create category
   */
  async createCategory(tenantSchema: string, data: { name: string; slug: string; description?: string; parentId?: number; imageUrl?: string }): Promise<any> {
    const category = await this.prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_category" (name, slug, description, parent_id, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, data.name, data.slug, data.description || '', data.parentId || null, data.imageUrl || null);
    return (category as any[])[0];
  }

  /**
   * Update product category
   */
  async updateProductCategory(tenantSchema: string, productId: number, categoryId: number): Promise<any> {
    const product = await this.prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}"."vendure_product"
      SET category_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, categoryId, productId);
    return (product as any[])[0];
  }

  // ==================== SEARCH METHODS (Phase 05) ====================

  /**
   * Search products
   */
  async searchProducts(tenantSchema: string, query: string): Promise<any[]> {
    const searchTerm = `%${query}%`;
    const products = await this.prisma.$queryRawUnsafe(`
      SELECT p.*, pv.sku, pv.price, pv.stock_on_hand, c.name as category_name
      FROM "${tenantSchema}"."vendure_product" p
      LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
      LEFT JOIN "${tenantSchema}"."vendure_category" c ON c.id = p.category_id
      WHERE p.enabled = true 
        AND (p.name ILIKE $1 OR p.description ILIKE $1 OR pv.sku ILIKE $1)
      ORDER BY p.name ASC
      LIMIT 50
    `, searchTerm);
    return products as any[];
  }
}


