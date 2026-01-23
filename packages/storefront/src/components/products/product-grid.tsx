'use client';

import { Product } from '@/types/product.types';
import { ProductCard } from './product-card';
import { Pagination } from '../ui/pagination';

interface ProductGridProps {
    products: Product[];
    tenantSubdomain: string;
    page: number;
    limit: number;
    totalProducts: number;
}

export function ProductGrid({
    products,
    tenantSubdomain,
    page,
    limit,
    totalProducts,
}: ProductGridProps) {
    const totalPages = Math.ceil(totalProducts / limit);

    if (products.length === 0) {
        return (
            <div className="col-span-full text-center py-16">
                <h2 className="text-2xl font-bold mb-4">لا توجد منتجات</h2>
                <p className="text-muted-foreground">
                    {page > 1
                        ? 'لم يتم العثور على منتجات في هذه الصفحة'
                        : 'لم يتم إضافة أي منتجات لهذا المتجر بعد'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        tenantSubdomain={tenantSubdomain}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        basePath={`/${tenantSubdomain}`}
                    />
                </div>
            )}
        </div>
    );
}
