import { Product } from '@/types/product.types';
import { handleError } from '@/lib/utils/error-handler';

// الحصول على المنتجات حسب المستأجر
export async function getProductsByTenant(
    tenantSubdomain: string,
    page: number = 1,
    limit: number = 20,
    searchQuery: string = '',
    category: string = ''
): Promise<{ data: Product[]; total: number }> {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (searchQuery) params.append('q', searchQuery);
        if (category) params.append('category', category);

        const response = await fetch(
            `/api/shop/${tenantSubdomain}/products?${params.toString()}`
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل تحميل المنتجات');
        }

        return await response.json();
    } catch (error) {
        return handleError(error, 'فشل في الحصول على المنتجات');
    }
}

// الحصول على منتج واحد
export async function getProductByTenant(
    tenantSubdomain: string,
    productId: string
): Promise<Product> {
    try {
        const response = await fetch(
            `/api/shop/${tenantSubdomain}/products/${productId}`
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل تحميل تفاصيل المنتج');
        }

        return await response.json();
    } catch (error) {
        return handleError(error, 'فشل في الحصول على تفاصيل المنتج');
    }
}
