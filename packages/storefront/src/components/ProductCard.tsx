'use client';

import { Product } from '@/lib/api';
import { useState } from 'react';

interface ProductCardProps {
    product: Product;
    onAddToCart: (productId: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
    const [adding, setAdding] = useState(false);

    const handleAddToCart = async () => {
        setAdding(true);
        await onAddToCart(product.id);
        setAdding(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            {/* Product Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-6xl">🛍️</span>
            </div>

            {/* Product Details */}
            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {product.description || 'High quality product'}
                </p>

                <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-indigo-600">
                        EGP {(product.price / 100).toFixed(2)}
                    </span>
                    {product.cooperative_eligible && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Coop Eligible
                        </span>
                    )}
                </div>

                <button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {adding ? 'Adding...' : 'Add to Cart'}
                </button>
            </div>
        </div>
    );
}
