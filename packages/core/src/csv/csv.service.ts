/**
 * CSV Import/Export Service
 * Handles bulk product import and export
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductCsvRow {
    name: string;
    slug: string;
    sku: string;
    price: number;
    stock: number;
    description?: string;
    category?: string;
}

export interface ImportResult {
    total: number;
    imported: number;
    failed: number;
    errors: { row: number; error: string }[];
}

@Injectable()
export class CsvService {
    private readonly logger = new Logger(CsvService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Parse CSV string to array of objects
     */
    parseCsv(csvContent: string): Record<string, string>[] {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const data: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            const row: Record<string, string> = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            data.push(row);
        }

        return data;
    }

    /**
     * Parse a single CSV line (handles quotes)
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * Import products from CSV
     */
    async importProducts(tenantSchema: string, csvContent: string): Promise<ImportResult> {
        const rows = this.parseCsv(csvContent);
        const result: ImportResult = {
            total: rows.length,
            imported: 0,
            failed: 0,
            errors: [],
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Validate required fields
                if (!row.name || !row.sku) {
                    throw new Error('Name and SKU are required');
                }

                const slug = row.slug || row.name.toLowerCase().replace(/\s+/g, '-');
                const price = parseInt(row.price, 10) || 0;
                const stock = parseInt(row.stock, 10) || 0;

                // Check if product exists
                const existing = await this.prisma.$queryRawUnsafe(`
          SELECT id FROM "${tenantSchema}"."vendure_product"
          WHERE slug = $1
        `, slug);

                if ((existing as any[]).length > 0) {
                    // Update existing product
                    const productId = (existing as any[])[0].id;

                    await this.prisma.$executeRawUnsafe(`
            UPDATE "${tenantSchema}"."vendure_product"
            SET name = $1, description = $2, updated_at = NOW()
            WHERE id = $3
          `, row.name, row.description || '', productId);

                    // Update variant
                    await this.prisma.$executeRawUnsafe(`
            UPDATE "${tenantSchema}"."vendure_product_variant"
            SET sku = $1, price = $2, stock_on_hand = $3, updated_at = NOW()
            WHERE product_id = $4
          `, row.sku, price, stock, productId);
                } else {
                    // Create new product
                    const productResult = await this.prisma.$queryRawUnsafe(`
            INSERT INTO "${tenantSchema}"."vendure_product" (name, slug, description, enabled)
            VALUES ($1, $2, $3, true)
            RETURNING id
          `, row.name, slug, row.description || '');

                    const productId = Number((productResult as any[])[0].id);

                    // Create variant
                    await this.prisma.$executeRawUnsafe(`
            INSERT INTO "${tenantSchema}"."vendure_product_variant" (product_id, sku, price, stock_on_hand)
            VALUES ($1, $2, $3, $4)
          `, productId, row.sku, price, stock);
                }

                result.imported++;
            } catch (error) {
                result.failed++;
                result.errors.push({ row: i + 2, error: String(error) });
            }
        }

        return result;
    }

    /**
     * Export products to CSV
     */
    async exportProducts(tenantSchema: string): Promise<string> {
        try {
            const products = await this.prisma.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          pv.sku,
          pv.price,
          pv.stock_on_hand
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        ORDER BY p.name
      `);

            // CSV headers
            const headers = ['id', 'name', 'slug', 'sku', 'price', 'stock', 'description'];
            const lines = [headers.join(',')];

            for (const p of products as any[]) {
                const values = [
                    p.id,
                    `"${(p.name || '').replace(/"/g, '""')}"`,
                    p.slug || '',
                    p.sku || '',
                    p.price || 0,
                    p.stock_on_hand || 0,
                    `"${(p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                ];
                lines.push(values.join(','));
            }

            return lines.join('\n');
        } catch (error) {
            return '';
        }
    }

    /**
     * Export orders to CSV
     */
    async exportOrders(tenantSchema: string, startDate?: Date, endDate?: Date): Promise<string> {
        try {
            let whereClause = `o.state NOT IN ('AddingItems')`;
            if (startDate) {
                whereClause += ` AND o.created_at >= '${startDate.toISOString()}'`;
            }
            if (endDate) {
                whereClause += ` AND o.created_at <= '${endDate.toISOString()}'`;
            }

            const orders = await this.prisma.$queryRawUnsafe(`
        SELECT 
          o.id,
          o.code,
          o.state,
          o.total,
          o.created_at,
          c.email as customer_email,
          c.first_name,
          c.last_name
        FROM "${tenantSchema}"."vendure_order" o
        LEFT JOIN "${tenantSchema}"."vendure_customer" c ON c.id = o.customer_id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
      `);

            const headers = ['order_id', 'code', 'status', 'total', 'date', 'customer_email', 'customer_name'];
            const lines = [headers.join(',')];

            for (const o of orders as any[]) {
                const values = [
                    o.id,
                    o.code || '',
                    o.state || '',
                    o.total || 0,
                    new Date(o.created_at).toISOString().split('T')[0],
                    o.customer_email || '',
                    `"${o.first_name || ''} ${o.last_name || ''}"`,
                ];
                lines.push(values.join(','));
            }

            return lines.join('\n');
        } catch (error) {
            return '';
        }
    }

    /**
     * Export customers to CSV
     */
    async exportCustomers(tenantSchema: string): Promise<string> {
        try {
            const customers = await this.prisma.$queryRawUnsafe(`
        SELECT 
          c.id,
          c.email,
          c.first_name,
          c.last_name,
          c.phone_number,
          c.created_at,
          COUNT(o.id) as order_count,
          COALESCE(SUM(o.total), 0) as total_spent
        FROM "${tenantSchema}"."vendure_customer" c
        LEFT JOIN "${tenantSchema}"."vendure_order" o ON o.customer_id = c.id AND o.state NOT IN ('AddingItems', 'Cancelled')
        GROUP BY c.id, c.email, c.first_name, c.last_name, c.phone_number, c.created_at
        ORDER BY total_spent DESC
      `);

            const headers = ['id', 'email', 'first_name', 'last_name', 'phone', 'signup_date', 'order_count', 'total_spent'];
            const lines = [headers.join(',')];

            for (const c of customers as any[]) {
                const values = [
                    c.id,
                    c.email || '',
                    c.first_name || '',
                    c.last_name || '',
                    c.phone_number || '',
                    new Date(c.created_at).toISOString().split('T')[0],
                    Number(c.order_count) || 0,
                    Number(c.total_spent) || 0,
                ];
                lines.push(values.join(','));
            }

            return lines.join('\n');
        } catch (error) {
            return '';
        }
    }

    /**
     * Get CSV template for products
     */
    getProductTemplate(): string {
        const headers = ['name', 'slug', 'sku', 'price', 'stock', 'description'];
        const example = ['Example Product', 'example-product', 'SKU-001', '10000', '50', 'Product description here'];
        return [headers.join(','), example.join(',')].join('\n');
    }
}
