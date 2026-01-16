/**
 * SEO Controller Unit Tests
 * Covers: Meta Tags, Sitemap, Robots.txt
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

describe('SeoController', () => {
    let controller: SeoController;

    const mockSeoService = {
        createSeoTables: jest.fn(),
        getMetaTags: jest.fn(),
        getProductMeta: jest.fn(),
        setMetaTags: jest.fn(),
        getAllSeoEntries: jest.fn(),
        generateSitemap: jest.fn(),
        generateRobotsTxt: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SeoController],
            providers: [
                { provide: SeoService, useValue: mockSeoService },
            ],
        }).compile();

        controller = module.get<SeoController>(SeoController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== MIGRATION ====================

    describe('migrateSeo', () => {
        it('should create SEO tables', async () => {
            mockSeoService.createSeoTables.mockResolvedValue(undefined);

            const result = await controller.migrateSeo('test-store');

            expect(result.success).toBe(true);
            expect(result.message).toContain('SEO tables created');
        });

        it('should handle migration errors', async () => {
            mockSeoService.createSeoTables.mockRejectedValue(new Error('Error'));

            await expect(controller.migrateSeo('test-store'))
                .rejects.toThrow(HttpException);
        });
    });

    // ==================== META TAGS ====================

    describe('getMetaTags', () => {
        it('should return meta tags for page', async () => {
            mockSeoService.getMetaTags.mockResolvedValue({
                title: 'Home | Cairo Store',
                description: 'Best products in Cairo',
                keywords: 'shopping, cairo, egypt',
            });

            const result = await controller.getMetaTags('test-store', 'home');

            expect(result.success).toBe(true);
            expect(result.data.title).toContain('Cairo');
        });

        it('should return meta for product page', async () => {
            mockSeoService.getMetaTags.mockResolvedValue({
                title: 'iPhone 15 Pro',
                description: 'Latest Apple iPhone',
            });

            const result = await controller.getMetaTags('test-store', 'product', '123');

            expect(result.success).toBe(true);
        });

        it('should throw without page type', async () => {
            await expect(controller.getMetaTags('test-store', ''))
                .rejects.toThrow(HttpException);
        });

        it('should return default on error', async () => {
            mockSeoService.getMetaTags.mockRejectedValue(new Error());

            const result = await controller.getMetaTags('test-store', 'category');

            expect(result.data.title).toBe('');
        });
    });

    describe('getProductMeta', () => {
        it('should return product SEO meta', async () => {
            mockSeoService.getProductMeta.mockResolvedValue({
                title: 'MacBook Pro M3',
                description: 'Powerful laptop',
                ogImage: '/images/macbook.jpg',
            });

            const result = await controller.getProductMeta('test-store', '456');

            expect(result.success).toBe(true);
            expect(result.data.ogImage).toBeDefined();
        });

        it('should return default on error', async () => {
            mockSeoService.getProductMeta.mockRejectedValue(new Error());

            const result = await controller.getProductMeta('test-store', '999');

            expect(result.data.title).toBe('');
        });
    });

    describe('setMetaTags', () => {
        it('should save meta tags', async () => {
            mockSeoService.setMetaTags.mockResolvedValue(undefined);

            const result = await controller.setMetaTags('test-store', {
                pageType: 'category',
                pageId: 5,
                meta: {
                    title: 'Electronics',
                    description: 'Best electronics',
                },
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('saved');
        });

        it('should throw without pageType', async () => {
            await expect(controller.setMetaTags('test-store', {
                pageType: '',
                meta: { title: 'Test', description: 'Test description' },
            })).rejects.toThrow(HttpException);
        });

        it('should throw without meta', async () => {
            await expect(controller.setMetaTags('test-store', {
                pageType: 'home',
                meta: undefined as any,
            })).rejects.toThrow(HttpException);
        });
    });

    describe('getAllSeoEntries', () => {
        it('should return all SEO entries', async () => {
            mockSeoService.getAllSeoEntries.mockResolvedValue([
                { pageType: 'home', title: 'Home' },
                { pageType: 'about', title: 'About Us' },
            ]);

            const result = await controller.getAllSeoEntries('test-store');

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
        });

        it('should return empty on error', async () => {
            mockSeoService.getAllSeoEntries.mockRejectedValue(new Error());

            const result = await controller.getAllSeoEntries('test-store');

            expect(result.data).toEqual([]);
        });
    });

    // ==================== SITEMAP & ROBOTS ====================

    describe('getSitemap', () => {
        it('should generate XML sitemap', async () => {
            const xmlContent = '<?xml version="1.0"?><urlset></urlset>';
            mockSeoService.generateSitemap.mockResolvedValue(xmlContent);

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
            } as any;

            await controller.getSitemap('test-store', 'https://store.com', mockRes);

            expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'application/xml');
            expect(mockRes.send).toHaveBeenCalledWith(xmlContent);
        });

        it('should handle sitemap errors', async () => {
            mockSeoService.generateSitemap.mockRejectedValue(new Error('Error'));

            const mockRes = { set: jest.fn(), send: jest.fn() } as any;

            await expect(controller.getSitemap('test-store', 'https://store.com', mockRes))
                .rejects.toThrow(HttpException);
        });
    });

    describe('getRobotsTxt', () => {
        it('should generate robots.txt', () => {
            mockSeoService.generateRobotsTxt.mockReturnValue('User-agent: *\nAllow: /');

            const mockRes = {
                set: jest.fn(),
                send: jest.fn(),
            } as any;

            controller.getRobotsTxt('test-store', 'https://store.com', mockRes);

            expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
            expect(mockRes.send).toHaveBeenCalled();
        });
    });
});
