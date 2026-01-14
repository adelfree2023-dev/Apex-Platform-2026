'use client';

import { Product } from '@/lib/api';

interface FlashSaleProductCardProps {
    product: Product;
    originalPrice: number;
    salePrice: number;
    onAddToCart: (productId: number) => void;
}

export default function FlashSaleProductCard({
    product,
    originalPrice,
    salePrice,
    onAddToCart
}: FlashSaleProductCardProps) {
    const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);

    return (
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-orange-200">
            {/* Discount Badge */}
            <div className="absolute top-3 left-3 z-10">
                <div className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm animate-pulse">
                    -{discount}%
                </div>
            </div>

            {/* Flash Icon */}
            <div className="absolute top-3 right-3 z-10 text-2xl animate-bounce">
                ⚡
            </div>

            {/* Product Image */}
            <div className="h-40 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <span className="text-5xl">🔥</span>
            </div>

            {/* Product Details */}
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{product.name}</h3>

                {/* Prices */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl font-bold text-red-600">
                        EGP {(salePrice / 100).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                        EGP {(originalPrice / 100).toFixed(2)}
                    </span>
                </div>

                <button
                    onClick={() => onAddToCart(product.id)}
                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-2 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all"
                >
                    🛒 Grab Deal
                </button>
            </div>
        </div>
    );
}
