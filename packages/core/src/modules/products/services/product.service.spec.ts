import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { createMockPrisma, createMockAudit } from '../../../../test/test-utils';

describe('ProductService', () => {
    let service: ProductService;
    let mockPrisma: any;
    let mockAudit: any;

    const tenantId = 'tenant-123';

    beforeEach(async () => {
        mockPrisma = createMockPrisma();
        mockAudit = createMockAudit();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: AuditService, useValue: mockAudit },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findProductsByTenant', () => {
        it('should return paginated products', async () => {
            const items = [{ id: 'p1', name: 'Product 1' }];
            const total = 1;
            mockPrisma.product.findMany.mockResolvedValue(items);
            mockPrisma.product.count.mockResolvedValue(total);

            const result = await service.findProductsByTenant(tenantId, 1, 10);

            expect(result).toEqual({ items, total });
            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ tenantId, status: 'ACTIVE' }),
                skip: 0,
                take: 10,
            }));
        });

        it('should apply search query and log activity', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.product.count.mockResolvedValue(0);

            await service.findProductsByTenant(tenantId, 1, 10, 'search-term');

            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    OR: [
                        { name: { contains: 'search-term', mode: 'insensitive' } },
                        { description: { contains: 'search-term', mode: 'insensitive' } },
                    ]
                })
            }));
            expect(mockAudit.logActivity).toHaveBeenCalledWith(expect.objectContaining({
                action: 'PRODUCT_SEARCH',
                details: expect.objectContaining({ searchQuery: 'search-term' })
            }));
        });

        it('should throw error if search query is too long', async () => {
            const longSearch = 'a'.repeat(101);
            await expect(service.findProductsByTenant(tenantId, 1, 10, longSearch))
                .rejects.toThrow(new HttpException('نص البحث طويل جداً', HttpStatus.BAD_REQUEST));
        });

        it('should apply category filter', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            await service.findProductsByTenant(tenantId, 1, 10, undefined, 'electronics');
            expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ category: 'electronics' })
            }));
        });
    });

    describe('findOneByTenant', () => {
        it('should return a product if found', async () => {
            const product = { id: 'p1', name: 'Product 1', tenantId };
            mockPrisma.product.findFirst.mockResolvedValue(product);

            const result = await service.findOneByTenant(tenantId, 'p1');
            expect(result).toEqual(product);
        });

        it('should log security event if product not found', async () => {
            mockPrisma.product.findFirst.mockResolvedValue(null);

            const result = await service.findOneByTenant(tenantId, 'non-existent');
            expect(result).toBeNull();
            expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('PRODUCT_NOT_FOUND', expect.any(Object));
        });

        it('should throw InternalServerErrorException on database error', async () => {
            mockPrisma.product.findFirst.mockRejectedValue(new Error('DB Error'));
            await expect(service.findOneByTenant(tenantId, 'p1'))
                .rejects.toThrow(new HttpException('خطأ في استرجاع بيانات المنتج', HttpStatus.INTERNAL_SERVER_ERROR));
        });
    });
});
