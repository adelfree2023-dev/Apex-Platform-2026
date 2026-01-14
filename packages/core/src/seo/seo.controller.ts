/**
 * SEO Controller
 * API endpoints for SEO, sitemap, and robots.txt
 */

import { Controller, Get, Post, Param, Query, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SeoService, MetaData } from './seo.service';

@Controller('api/shop')
export class SeoController {
    constructor(private readonly seoService: SeoService) { }

    /**
     * Migrate SEO tables
     */
    @Post(':tenantId/migrate-seo')
    async migrateSeo(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            await this.seoService.createSeoTables(tenantSchema);
            return {
                success: true,
                message: 'SEO tables created with default meta tags',
            };
        } catch (error) {
            throw new HttpException(
                `Migration failed: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get meta tags for a page
     */
    @Get(':tenantId/seo/meta')
    async getMetaTags(
        @Param('tenantId') tenantId: string,
        @Query('page') pageType: string,
        @Query('id') pageId?: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!pageType) {
            throw new HttpException('Page type is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const meta = await this.seoService.getMetaTags(
                tenantSchema,
                pageType,
                pageId ? parseInt(pageId, 10) : undefined,
            );
            return {
                success: true,
                data: meta || { title: '', description: '' },
            };
        } catch (error) {
            return { success: true, data: { title: '', description: '' } };
        }
    }

    /**
     * Get product meta
     */
    @Get(':tenantId/products/:productId/seo')
    async getProductMeta(
        @Param('tenantId') tenantId: string,
        @Param('productId') productId: string,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const meta = await this.seoService.getProductMeta(
                tenantSchema,
                parseInt(productId, 10),
            );
            return {
                success: true,
                data: meta,
            };
        } catch (error) {
            return { success: true, data: { title: '', description: '' } };
        }
    }

    /**
     * Set meta tags
     */
    @Post(':tenantId/seo/meta')
    async setMetaTags(
        @Param('tenantId') tenantId: string,
        @Body() body: { pageType: string; pageId?: number; meta: MetaData },
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        if (!body.pageType || !body.meta) {
            throw new HttpException('Page type and meta are required', HttpStatus.BAD_REQUEST);
        }

        try {
            await this.seoService.setMetaTags(
                tenantSchema,
                body.pageType,
                body.pageId || null,
                body.meta,
            );
            return {
                success: true,
                message: 'Meta tags saved',
            };
        } catch (error) {
            throw new HttpException(
                `Failed to save meta: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get all SEO entries
     */
    @Get(':tenantId/seo/all')
    async getAllSeoEntries(@Param('tenantId') tenantId: string) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const entries = await this.seoService.getAllSeoEntries(tenantSchema);
            return {
                success: true,
                data: entries,
                count: entries.length,
            };
        } catch (error) {
            return { success: true, data: [], count: 0 };
        }
    }

    /**
     * Generate sitemap.xml
     */
    @Get(':tenantId/sitemap.xml')
    async getSitemap(
        @Param('tenantId') tenantId: string,
        @Query('baseUrl') baseUrl: string = 'https://store.example.com',
        @Res() res: Response,
    ) {
        const tenantSchema = `tenant_${tenantId.replace(/-/g, '_')}`;

        try {
            const sitemap = await this.seoService.generateSitemap(tenantSchema, baseUrl);
            res.set('Content-Type', 'application/xml');
            res.send(sitemap);
        } catch (error) {
            throw new HttpException(
                `Failed to generate sitemap: ${error}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Generate robots.txt
     */
    @Get(':tenantId/robots.txt')
    getRobotsTxt(
        @Param('tenantId') tenantId: string,
        @Query('baseUrl') baseUrl: string = 'https://store.example.com',
        @Res() res: Response,
    ) {
        const robotsTxt = this.seoService.generateRobotsTxt(baseUrl, tenantId);
        res.set('Content-Type', 'text/plain');
        res.send(robotsTxt);
    }
}
