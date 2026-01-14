/**
 * Advanced Search Service
 * Full-text search with filters, sorting, and pagination
 * Uses PostgreSQL full-text search (no external dependencies)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchFilters {
    query?: string;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'name' | 'price_asc' | 'price_desc' | 'newest' | 'popular';
    page?: number;
    limit?: number;
}

export interface SearchResult {
    products: any[];
    total: number;
    page: number;
    totalPages: number;
    filters: SearchFilters;
}

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Advanced product search with filters
     */
    async searchProducts(tenantSchema: string, filters: SearchFilters): Promise<SearchResult> {
        const {
            query = '',
            categorySlug,
            minPrice,
            maxPrice,
            inStock,
            sortBy = 'name',
            page = 1,
            limit = 20,
        } = filters;

        const offset = (page - 1) * limit;

        try {
            // Build WHERE clauses
            const whereClauses: string[] = ['p.enabled = true'];
            const params: any[] = [];
            let paramIndex = 1;

            // Text search
            if (query && query.length >= 2) {
                whereClauses.push(`(
          p.name ILIKE $${paramIndex} OR 
          p.description ILIKE $${paramIndex} OR 
          pv.sku ILIKE $${paramIndex}
        )`);
                params.push(`%${query}%`);
                paramIndex++;
            }

            // Category filter
            if (categorySlug) {
                whereClauses.push(`c.slug = $${paramIndex}`);
                params.push(categorySlug);
                paramIndex++;
            }

            // Price range
            if (minPrice !== undefined) {
                whereClauses.push(`pv.price >= $${paramIndex}`);
                params.push(minPrice);
                paramIndex++;
            }

            if (maxPrice !== undefined) {
                whereClauses.push(`pv.price <= $${paramIndex}`);
                params.push(maxPrice);
                paramIndex++;
            }

            // In stock filter
            if (inStock) {
                whereClauses.push(`pv.stock_on_hand > 0`);
            }

            // Build ORDER BY
            let orderBy = 'p.name ASC';
            switch (sortBy) {
                case 'price_asc':
                    orderBy = 'pv.price ASC';
                    break;
                case 'price_desc':
                    orderBy = 'pv.price DESC';
                    break;
                case 'newest':
                    orderBy = 'p.created_at DESC';
                    break;
                case 'popular':
                    orderBy = 'order_count DESC';
                    break;
            }

            const whereClause = whereClauses.join(' AND ');

            // Get total count
            const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        LEFT JOIN "${tenantSchema}"."vendure_category" c ON c.id = p.category_id
        WHERE ${whereClause}
      `;

            const countResult = await this.prisma.$queryRawUnsafe(countQuery, ...params);
            const total = parseInt((countResult as any[])[0]?.total || '0', 10);

            // Get products with pagination
            const productsQuery = `
        SELECT DISTINCT
          p.id,
          p.name,
          p.slug,
          p.description,
          p.enabled,
          p.created_at,
          pv.id as variant_id,
          pv.sku,
          pv.price,
          pv.stock_on_hand,
          c.name as category_name,
          c.slug as category_slug,
          (SELECT COUNT(*) FROM "${tenantSchema}"."vendure_order_line" ol 
           WHERE ol.product_variant_id = pv.id) as order_count
        FROM "${tenantSchema}"."vendure_product" p
        LEFT JOIN "${tenantSchema}"."vendure_product_variant" pv ON pv.product_id = p.id
        LEFT JOIN "${tenantSchema}"."vendure_category" c ON c.id = p.category_id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            params.push(limit, offset);

            const products = await this.prisma.$queryRawUnsafe(productsQuery, ...params);

            return {
                products: products as any[],
                total,
                page,
                totalPages: Math.ceil(total / limit),
                filters,
            };
        } catch (error) {
            this.logger.error(`Search failed: ${error}`);
            return {
                products: [],
                total: 0,
                page: 1,
                totalPages: 0,
                filters,
            };
        }
    }

    /**
     * Get search suggestions (autocomplete)
     */
    async getSearchSuggestions(tenantSchema: string, query: string, limit: number = 5): Promise<string[]> {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT DISTINCT name
        FROM "${tenantSchema}"."vendure_product"
        WHERE name ILIKE $1 AND enabled = true
        ORDER BY name
        LIMIT $2
      `, `%${query}%`, limit);

            return (result as any[]).map(r => r.name);
        } catch (error) {
            return [];
        }
    }

    /**
     * Get available filters (facets)
     */
    async getSearchFacets(tenantSchema: string): Promise<any> {
        try {
            // Categories
            const categories = await this.prisma.$queryRawUnsafe(`
        SELECT c.id, c.name, c.slug, COUNT(p.id) as product_count
        FROM "${tenantSchema}"."vendure_category" c
        LEFT JOIN "${tenantSchema}"."vendure_product" p ON p.category_id = c.id
        WHERE p.enabled = true OR p.enabled IS NULL
        GROUP BY c.id, c.name, c.slug
        ORDER BY product_count DESC
      `);

            // Price range
            const priceRange = await this.prisma.$queryRawUnsafe(`
        SELECT 
          MIN(pv.price) as min_price,
          MAX(pv.price) as max_price
        FROM "${tenantSchema}"."vendure_product_variant" pv
        JOIN "${tenantSchema}"."vendure_product" p ON p.id = pv.product_id
        WHERE p.enabled = true
      `);

            // Stock status
            const stockStatus = await this.prisma.$queryRawUnsafe(`
        SELECT 
          SUM(CASE WHEN pv.stock_on_hand > 0 THEN 1 ELSE 0 END) as in_stock,
          SUM(CASE WHEN pv.stock_on_hand <= 0 THEN 1 ELSE 0 END) as out_of_stock
        FROM "${tenantSchema}"."vendure_product_variant" pv
        JOIN "${tenantSchema}"."vendure_product" p ON p.id = pv.product_id
        WHERE p.enabled = true
      `);

            return {
                categories: categories as any[],
                priceRange: {
                    min: parseInt((priceRange as any[])[0]?.min_price || '0', 10),
                    max: parseInt((priceRange as any[])[0]?.max_price || '0', 10),
                },
                stockStatus: {
                    inStock: parseInt((stockStatus as any[])[0]?.in_stock || '0', 10),
                    outOfStock: parseInt((stockStatus as any[])[0]?.out_of_stock || '0', 10),
                },
            };
        } catch (error) {
            return {
                categories: [],
                priceRange: { min: 0, max: 0 },
                stockStatus: { inStock: 0, outOfStock: 0 },
            };
        }
    }

    /**
     * Index product for search (for future Elasticsearch migration)
     */
    async indexProduct(tenantSchema: string, productId: number): Promise<void> {
        // Currently using PostgreSQL - no indexing needed
        // This method is placeholder for future Elasticsearch integration
        this.logger.log(`Product ${productId} indexed for search in ${tenantSchema}`);
    }
}
