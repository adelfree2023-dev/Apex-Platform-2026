import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoryService {
    private readonly logger = new Logger(CategoryService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findCategoriesByTenant(tenantId: string) {
        // Since we don't have a separate Category model, we'll get unique categories from products
        const products = await this.prisma.product.findMany({
            where: {
                tenantId,
                status: 'ACTIVE',
            },
            select: {
                category: true,
            },
            distinct: ['category'],
        });

        return products.map(p => ({
            id: p.category,
            name: p.category,
            slug: p.category.toLowerCase().replace(/\s+/g, '-'),
        }));
    }
}
