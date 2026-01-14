/**
 * SEO Service
 * Handles meta tags, sitemap, and robots.txt
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MetaData {
    title: string;
    description: string;
    keywords?: string;
    ogImage?: string;
    ogType?: string;
    canonical?: string;
}

@Injectable()
export class SeoService {
    private readonly logger = new Logger(SeoService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create SEO tables
     */
    async createSeoTables(tenantSchema: string): Promise<void> {
        // SEO meta tags table
        await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}"."vendure_seo_meta" (
        id SERIAL PRIMARY KEY,
        page_type VARCHAR(50) NOT NULL,
        page_id INT,
        title VARCHAR(200),
        description VARCHAR(500),
        keywords VARCHAR(500),
        og_image VARCHAR(500),
        og_type VARCHAR(50) DEFAULT 'website',
        canonical VARCHAR(500),
        no_index BOOLEAN DEFAULT false,
        no_follow BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(page_type, page_id)
      )
    `);

        // Insert default meta tags
        const defaults = [
            { type: 'home', title: 'Welcome to Our Store', desc: 'Discover amazing products at great prices' },
            { type: 'products', title: 'Our Products', desc: 'Browse our collection of products' },
            { type: 'cart', title: 'Shopping Cart', desc: 'Review your cart and checkout' },
            { type: 'checkout', title: 'Checkout', desc: 'Complete your purchase securely' },
        ];

        for (const d of defaults) {
            await this.prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}"."vendure_seo_meta" (page_type, title, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (page_type, page_id) DO NOTHING
      `, d.type, d.title, d.desc);
        }
    }

    /**
     * Get meta tags for a page
     */
    async getMetaTags(tenantSchema: string, pageType: string, pageId?: number): Promise<MetaData | null> {
        try {
            const condition = pageId
                ? `page_type = $1 AND page_id = $2`
                : `page_type = $1 AND page_id IS NULL`;

            const params = pageId ? [pageType, pageId] : [pageType];

            const result = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_seo_meta"
        WHERE ${condition}
        LIMIT 1
      `, ...params);

            if ((result as any[]).length === 0) return null;

            const row = (result as any[])[0];
            return {
                title: row.title,
                description: row.description,
                keywords: row.keywords,
                ogImage: row.og_image,
                ogType: row.og_type,
                canonical: row.canonical,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Set meta tags
     */
    async setMetaTags(tenantSchema: string, pageType: string, pageId: number | null, meta: MetaData): Promise<void> {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}"."vendure_seo_meta" 
      (page_type, page_id, title, description, keywords, og_image, og_type, canonical)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (page_type, page_id) DO UPDATE SET
        title = $3, description = $4, keywords = $5, og_image = $6, og_type = $7, canonical = $8, updated_at = NOW()
    `, pageType, pageId, meta.title, meta.description, meta.keywords || null, meta.ogImage || null, meta.ogType || 'website', meta.canonical || null);
    }

    /**
     * Get product meta (with fallback to product data)
     */
    async getProductMeta(tenantSchema: string, productId: number): Promise<MetaData> {
        // Try to get custom meta
        const customMeta = await this.getMetaTags(tenantSchema, 'product', productId);
        if (customMeta) return customMeta;

        // Fallback: generate from product data
        try {
            const product = await this.prisma.$queryRawUnsafe(`
        SELECT name, description, slug FROM "${tenantSchema}"."vendure_product"
        WHERE id = $1
      `, productId);

            if ((product as any[]).length > 0) {
                const p = (product as any[])[0];
                return {
                    title: `${p.name} | Shop Now`,
                    description: p.description?.substring(0, 160) || `Buy ${p.name} - Quality product at great prices`,
                    ogType: 'product',
                };
            }
        } catch (error) {
            // Ignore
        }

        return {
            title: 'Product Details',
            description: 'View product details and add to cart',
        };
    }

    /**
     * Generate sitemap XML
     */
    async generateSitemap(tenantSchema: string, baseUrl: string): Promise<string> {
        const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [];

        // Static pages
        urls.push(
            { loc: `${baseUrl}/`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '1.0' },
            { loc: `${baseUrl}/products`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.9' },
            { loc: `${baseUrl}/categories`, lastmod: new Date().toISOString(), changefreq: 'weekly', priority: '0.8' },
        );

        // Products
        try {
            const products = await this.prisma.$queryRawUnsafe(`
        SELECT slug, updated_at FROM "${tenantSchema}"."vendure_product"
        WHERE enabled = true OR enabled IS NULL
        ORDER BY updated_at DESC
        LIMIT 500
      `);

            for (const p of products as any[]) {
                urls.push({
                    loc: `${baseUrl}/products/${p.slug}`,
                    lastmod: new Date(p.updated_at || Date.now()).toISOString(),
                    changefreq: 'weekly',
                    priority: '0.7',
                });
            }
        } catch (error) {
            // Ignore
        }

        // Categories
        try {
            const categories = await this.prisma.$queryRawUnsafe(`
        SELECT slug, updated_at FROM "${tenantSchema}"."vendure_collection"
        WHERE is_private = false OR is_private IS NULL
        ORDER BY position
        LIMIT 100
      `);

            for (const c of categories as any[]) {
                urls.push({
                    loc: `${baseUrl}/categories/${c.slug}`,
                    lastmod: new Date(c.updated_at || Date.now()).toISOString(),
                    changefreq: 'weekly',
                    priority: '0.6',
                });
            }
        } catch (error) {
            // Ignore
        }

        // Generate XML
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod.split('T')[0]}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    }

    /**
     * Generate robots.txt
     */
    generateRobotsTxt(baseUrl: string, tenantId: string): string {
        return `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`;
    }

    /**
     * Get all SEO entries
     */
    async getAllSeoEntries(tenantSchema: string): Promise<any[]> {
        try {
            const entries = await this.prisma.$queryRawUnsafe(`
        SELECT * FROM "${tenantSchema}"."vendure_seo_meta"
        ORDER BY page_type, page_id
      `);

            return (entries as any[]).map(e => ({
                id: Number(e.id),
                pageType: e.page_type,
                pageId: e.page_id,
                title: e.title,
                description: e.description,
                keywords: e.keywords,
                ogImage: e.og_image,
                noIndex: e.no_index,
                noFollow: e.no_follow,
            }));
        } catch (error) {
            return [];
        }
    }
}
