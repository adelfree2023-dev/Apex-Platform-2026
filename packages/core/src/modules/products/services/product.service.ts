import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/monitoring/audit/audit.service';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    // ✅ S2: عزل المنتجات حسب المستأجر مع S4: تسجيل البحث
    async findProductsByTenant(
        tenantId: string,
        page: number,
        limit: number,
        searchQuery?: string,
        category?: string,
    ) {
        try {
            const where: any = {
                tenantId,
                status: 'ACTIVE',
            };

            if (searchQuery) {
                // تصفية الكلمات الحساسة أو التحقق من الطول (S3 مبسط)
                if (searchQuery.length > 100) {
                    throw new HttpException('نص البحث طويل جداً', HttpStatus.BAD_REQUEST);
                }

                where.OR = [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { description: { contains: searchQuery, mode: 'insensitive' } },
                ];
            }

            if (category) {
                where.category = category;
            }

            const [items, total] = await Promise.all([
                this.prisma.product.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.product.count({ where }),
            ]);

            // ✅ S4: تسجيل عمليات البحث المهمة
            if (searchQuery) {
                await this.auditService.logActivity({
                    tenantId,
                    userId: 'anonymous',
                    action: 'PRODUCT_SEARCH',
                    details: { searchQuery, resultCount: items.length },
                });
            }

            return { items, total };
        } catch (error) {
            this.logger.error(`Failed to find products for tenant ${tenantId}: ${error.message}`);
            throw error instanceof HttpException ? error : new HttpException('خطأ في استرجاع المنتجات', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ✅ S2: جلب منتج واحد مع التحقق الأمني
    async findOneByTenant(tenantId: string, productId: string) {
        try {
            const product = await this.prisma.product.findFirst({
                where: {
                    id: productId,
                    tenantId,
                    status: 'ACTIVE',
                },
            });

            if (!product) {
                // ✅ S4: تسجيل محاولات الوصول غير الصالحة
                await this.auditService.logSecurityEvent('PRODUCT_NOT_FOUND', {
                    severity: 'LOW',
                    tenantId,
                    productId,
                });
            }

            return product;
        } catch (error) {
            this.logger.error(`Product lookup failed: ${error.message}`);
            throw new HttpException('خطأ في استرجاع بيانات المنتج', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
