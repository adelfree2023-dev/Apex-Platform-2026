'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import FlashSaleTimer from '@/components/FlashSaleTimer';
import FlashSaleProductCard from '@/components/FlashSaleProductCard';
import { getProducts, addToCart, Product } from '@/lib/api';

export default function FlashSalesPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saleEnded, setSaleEnded] = useState(false);

    // Flash sale end time (24 hours from now for demo)
    const saleEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const getSessionId = () => {
        if (typeof window !== 'undefined') {
            let sessionId = localStorage.getItem('apex_session_id');
            if (!sessionId) {
                sessionId = 'session_' + Date.now();
                localStorage.setItem('apex_session_id', sessionId);
            }
            return sessionId;
        }
        return 'session_' + Date.now();
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getProducts(tenantId);
                setProducts(response.data || []);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [tenantId]);

    const handleAddToCart = async (productId: number) => {
        const sessionId = getSessionId();
        try {
            await addToCart(tenantId, sessionId, productId, 1);
            alert('🎉 Flash Deal Added to Cart!');
        } catch (error) {
            console.error('Failed to add to cart:', error);
        }
    };

    if (saleEnded) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Header />
                <main className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <span className="text-6xl mb-4 block">😢</span>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Flash Sale Ended</h1>
                    <p className="text-gray-600 mb-8">Stay tuned for our next flash sale!</p>
                    <a
                        href={`/${tenantId}`}
                        className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700"
                    >
                        Browse All Products
                    </a>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Flash Sale Timer */}
                <div className="mb-8">
                    <FlashSaleTimer
                        endDate={saleEndDate}
                        title="Flash Sale Ends In"
                        onExpire={() => setSaleEnded(true)}
                    />
                </div>

                {/* Flash Sale Banner */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                        🔥 <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Flash Sale</span> 🔥
                    </h1>
                    <p className="text-xl text-gray-600">Up to 50% OFF on selected items!</p>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="text-center py-16">
                        <span className="text-4xl animate-spin inline-block">⏳</span>
                        <p className="mt-4 text-gray-600">Loading deals...</p>
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.map((product) => (
                            <FlashSaleProductCard
                                key={product.id}
                                product={product}
                                originalPrice={product.price}
                                salePrice={Math.round(product.price * 0.7)} // 30% off
                                onAddToCart={handleAddToCart}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <span className="text-6xl mb-4 block">📦</span>
                        <h2 className="text-2xl font-bold text-gray-700">No flash deals available</h2>
                    </div>
                )}
            </main>
        </div>
    );
}
