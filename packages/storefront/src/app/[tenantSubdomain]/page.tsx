import { getProductsByTenant } from '@/lib/api/products';
import { ProductGrid } from '@/components/products/product-grid';
import { SearchBar } from '@/components/search/search-bar';
import { CategoryFilters } from '@/components/categories/category-filters';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default async function TenantHomePage({
    params,
    searchParams,
}: {
    params: { tenantSubdomain: string };
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const page = searchParams?.page ? Number(searchParams.page) : 1;
    const limit = searchParams?.limit ? Number(searchParams.limit) : 20;
    const searchQuery = searchParams?.q?.toString() || '';
    const category = searchParams?.category?.toString() || '';

    let products: any[] = [];
    let totalProducts = 0;
    let error = null;

    try {
        // الحصول على المنتجات مع التصفية والبحث
        const result = await getProductsByTenant(
            params.tenantSubdomain,
            page,
            limit,
            searchQuery,
            category
        );

        products = result.data;
        totalProducts = result.total;
    } catch (err) {
        error = err instanceof Error ? err.message : 'فشل تحميل المنتجات';
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">مرحباً بكم في متجرنا</h1>
                <p className="text-muted-foreground">
                    استكشفوا أحدث منتجاتنا وجودة الخدمة التي نقدمها لكم
                </p>
            </div>

            <div className="mb-8">
                <SearchBar
                    defaultValue={searchQuery}
                    placeholder="ابحث عن منتجات..."
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:block hidden">
                    <Suspense fallback={<LoadingSpinner />}>
                        <CategoryFilters tenantSubdomain={params.tenantSubdomain} />
                    </Suspense>
                </div>

                <div className="lg:col-span-3">
                    {error ? (
                        <div className="text-center py-12">
                            <p className="text-destructive">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : (
                        <ProductGrid
                            products={products}
                            tenantSubdomain={params.tenantSubdomain}
                            page={page}
                            limit={limit}
                            totalProducts={totalProducts}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
