import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findProductsByTenant(
        tenantId: string,
        page: number,
        limit: number,
        searchQuery?: string,
        category?: string,
    ) {
        const where: any = {
            tenantId,
            status: 'ACTIVE',
        };

        if (searchQuery) {
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

        return { items, total };
    }

    async findOneByTenant(tenantId: string, productId: string) {
        return this.prisma.product.findFirst({
            where: {
                id: productId,
                tenantId,
                status: 'ACTIVE',
            },
        });
    }
}
