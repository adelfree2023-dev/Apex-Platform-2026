'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface Product {
    id: number;
    name: string;
    slug: string;
    price: number | null;
    reason: string;
}

interface ProductRecommendationsProps {
    tenantId: string;
    productId?: number;
    customerId?: number;
    type: 'similar' | 'bought-together' | 'personalized' | 'trending';
    limit?: number;
}

export default function ProductRecommendations({
    tenantId,
    productId,
    customerId,
    type,
    limit = 6,
}: ProductRecommendationsProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            let endpoint = '';

            switch (type) {
                case 'similar':
                    endpoint = `${API_BASE}/api/shop/${tenantId}/products/${productId}/similar?limit=${limit}`;
                    break;
                case 'bought-together':
                    endpoint = `${API_BASE}/api/shop/${tenantId}/products/${productId}/bought-together?limit=${limit}`;
                    break;
                case 'personalized':
                    endpoint = `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/recommendations?limit=${limit}`;
                    break;
                case 'trending':
                    endpoint = `${API_BASE}/api/shop/${tenantId}/ai/trending?limit=${limit}`;
                    break;
            }

            try {
                const res = await fetch(endpoint);
                const data = await res.json();
                if (data.success) {
                    setProducts(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            } finally {
                setLoading(false);
            }
        };

        if ((type === 'similar' || type === 'bought-together') && !productId) return;
        if (type === 'personalized' && !customerId) return;

        fetchRecommendations();
    }, [tenantId, productId, customerId, type, limit]);

    const titles: Record<string, string> = {
        similar: '✨ Similar Products',
        'bought-together': '🛒 Frequently Bought Together',
        personalized: '🎯 Recommended for You',
        trending: '🔥 Trending Now',
    };

    if (loading) {
        return (
            <div className="animate-pulse bg-gray-100 rounded-2xl h-48 flex items-center justify-center">
                <span className="text-2xl">⏳</span>
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <div className="my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{titles[type]}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {products.map((product) => (
                    <a
                        key={product.id}
                        href={`/${tenantId}/products/${product.slug}`}
                        className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all group"
                    >
                        <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center">
                            <span className="text-3xl group-hover:scale-110 transition-transform">📦</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                            {product.name}
                        </h4>
                        {product.price && (
                            <div className="text-indigo-600 font-bold text-sm">
                                EGP {(product.price / 100).toFixed(0)}
                            </div>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
}
