'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface WishlistItem {
    id: number;
    productId: number;
    productName: string;
    productSlug: string;
    price: number | null;
    stockOnHand: number | null;
    inStock: boolean;
    addedAt: string;
}

interface WishlistPageProps {
    tenantId: string;
    customerId: number;
}

export default function WishlistPage({ tenantId, customerId }: WishlistPageProps) {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlist = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/wishlist`
            );
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, [tenantId, customerId]);

    const handleRemove = async (productId: number) => {
        try {
            await fetch(
                `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/wishlist/${productId}`,
                { method: 'DELETE' }
            );
            setItems(items.filter(i => i.productId !== productId));
        } catch (error) {
            console.error('Failed to remove:', error);
        }
    };

    const handleMoveToCart = async (productId: number) => {
        const sessionId = localStorage.getItem('apex_session_id') || `session_${Date.now()}`;
        localStorage.setItem('apex_session_id', sessionId);

        try {
            await fetch(
                `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/wishlist/${productId}/move-to-cart`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                }
            );
            setItems(items.filter(i => i.productId !== productId));
        } catch (error) {
            console.error('Failed to move to cart:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="text-5xl animate-pulse">❤️</span>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-20">
                <span className="text-6xl mb-4 block">💔</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Wishlist is Empty</h2>
                <p className="text-gray-500 mb-6">Start saving products you love!</p>
                <Link
                    href={`/${tenantId}`}
                    className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700"
                >
                    Browse Products
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span>❤️</span> My Wishlist
                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm">
                    {items.length} items
                </span>
            </h1>

            <div className="space-y-4">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white rounded-xl p-4 shadow-md flex items-center justify-between gap-4"
                    >
                        <div className="flex-1">
                            <Link
                                href={`/${tenantId}/products/${item.productSlug}`}
                                className="font-semibold text-gray-900 hover:text-indigo-600"
                            >
                                {item.productName}
                            </Link>
                            <div className="flex items-center gap-3 mt-1">
                                {item.price && (
                                    <span className="text-green-600 font-bold">
                                        EGP {(item.price / 100).toFixed(2)}
                                    </span>
                                )}
                                <span className={`text-sm ${item.inStock ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleMoveToCart(item.productId)}
                                disabled={!item.inStock}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <span>🛒</span> Add to Cart
                            </button>
                            <button
                                onClick={() => handleRemove(item.productId)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                title="Remove"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
