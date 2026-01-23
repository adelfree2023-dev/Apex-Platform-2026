export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    salePrice?: number;
    currency: string;
    images: string[];
    category: string;
    subcategory?: string;
    tags: string[];
    sku: string;
    stock: number;
    rating: number;
    reviewsCount: number;
    createdAt: string;
    updatedAt: string;
    isFeatured: boolean;
    attributes: Record<string, string | number | boolean>;
}
