'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface BundleItem {
    productName: string;
    quantity: number;
    price: number;
}

interface Bundle {
    id: number;
    name: string;
    slug: string;
    description: string;
    bundlePrice: number;
    originalPrice: number;
    discountPercentage: number;
    items: BundleItem[];
}

interface BundleCardProps {
    tenantId: string;
    bundle: Bundle;
    onAddToCart: () => void;
}

export function BundleCard({ tenantId, bundle, onAddToCart }: BundleCardProps) {
    const [adding, setAdding] = useState(false);

    const handleAddToCart = async () => {
        setAdding(true);
        const sessionId = localStorage.getItem('apex_session_id') || `session_${Date.now()}`;
        localStorage.setItem('apex_session_id', sessionId);

        try {
            await fetch(`${API_BASE}/api/shop/${tenantId}/bundles/${bundle.id}/add-to-cart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            onAddToCart();
        } catch (error) {
            console.error('Failed to add bundle:', error);
        } finally {
            setAdding(false);
        }
    };

    const savings = bundle.originalPrice - bundle.bundlePrice;

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border-2 border-yellow-400">
            {/* Bundle Badge */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-white font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <span>📦</span> Product Bundle
                </span>
                <span className="bg-white text-orange-600 px-2 py-1 rounded-full text-sm">
                    Save {bundle.discountPercentage}%
                </span>
            </div>

            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{bundle.name}</h3>
                {bundle.description && (
                    <p className="text-gray-500 text-sm mb-4">{bundle.description}</p>
                )}

                {/* Items List */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Includes:</h4>
                    <ul className="space-y-2">
                        {bundle.items.map((item, i) => (
                            <li key={i} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="text-green-500">✓</span>
                                    {item.productName} {item.quantity > 1 && `x${item.quantity}`}
                                </span>
                                <span className="text-gray-400 line-through">
                                    EGP {((item.price * item.quantity) / 100).toFixed(2)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Pricing */}
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <div className="text-sm text-gray-400 line-through">
                            EGP {(bundle.originalPrice / 100).toFixed(2)}
                        </div>
                        <div className="text-3xl font-bold text-green-600">
                            EGP {(bundle.bundlePrice / 100).toFixed(2)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">You save</div>
                        <div className="text-lg font-bold text-orange-600">
                            EGP {(savings / 100).toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Add to Cart */}
                <button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {adding ? (
                        <span className="animate-spin">⏳</span>
                    ) : (
                        <>
                            <span>🛒</span>
                            Add Bundle to Cart
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

interface BundleListProps {
    tenantId: string;
}

export default function BundleList({ tenantId }: BundleListProps) {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBundles = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/bundles`);
            const data = await res.json();
            if (data.success) {
                setBundles(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch bundles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBundles();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl animate-spin">📦</span>
            </div>
        );
    }

    if (bundles.length === 0) {
        return null;
    }

    return (
        <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span>🎁</span> Special Bundles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bundles.map((bundle) => (
                    <BundleCard
                        key={bundle.id}
                        tenantId={tenantId}
                        bundle={bundle}
                        onAddToCart={fetchBundles}
                    />
                ))}
            </div>
        </div>
    );
}
