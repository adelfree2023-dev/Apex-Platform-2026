/**
 * SEO Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SeoService } from './seo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SeoService', () => {
    let service: SeoService;

    const mockPrismaService = {
        $executeRawUnsafe: jest.fn(),
        $queryRawUnsafe: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeoService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SeoService>(SeoService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSeoTables', () => {
        it('should create SEO tables', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);
            await service.createSeoTables('tenant_test');
            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('getMetaTags', () => {
        it('should return meta tags for page', async () => {
            const mockMeta = [{
                id: 1, page_type: 'product', page_id: 1,
                title: 'Product Title', description: 'Product Description',
                keywords: 'product, shop',
            }];

            mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockMeta);

            const result = await service.getMetaTags('tenant_test', 'product', 1);

            expect(result.title).toBe('Product Title');
        });

        it('should return default meta if not found', async () => {
            mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

            const result = await service.getMetaTags('tenant_test', 'product', 999);

            expect(result).toBeDefined();
        });
    });

    describe('updateMetaTags', () => {
        it('should update meta tags', async () => {
            mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

            await service.updateMetaTags('tenant_test', 'product', 1, {
                title: 'New Title',
                description: 'New Description',
            });

            expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
        });
    });

    describe('generateSitemap', () => {
        it('should generate sitemap XML', async () => {
            const mockProducts = [
                { slug: 'product-1', updated_at: new Date() },
                { slug: 'product-2', updated_at: new Date() },
            ];
            const mockCategories = [
                { slug: 'category-1', updated_at: new Date() },
            ];

            mockPrismaService.$queryRawUnsafe
                .mockResolvedValueOnce(mockProducts)
                .mockResolvedValueOnce(mockCategories);

            const result = await service.generateSitemap('tenant_test', 'https://store.com');

            expect(result).toContain('<?xml');
            expect(result).toContain('urlset');
        });
    });

    describe('generateRobotsTxt', () => {
        it('should generate robots.txt', () => {
            const result = service.generateRobotsTxt('https://store.com');

            expect(result).toContain('User-agent');
            expect(result).toContain('Sitemap');
        });
    });
});
