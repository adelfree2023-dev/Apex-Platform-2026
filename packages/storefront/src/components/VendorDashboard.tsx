'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface VendorDashboardProps {
    tenantId: string;
    vendorId: number;
}

interface VendorOrder {
    id: number;
    orderCode: string;
    subtotal: number;
    commission: number;
    payout: number;
    status: string;
    createdAt: string;
}

interface VendorProduct {
    id: number;
    name: string;
    price: number | null;
    stock: number;
    status: string;
}

export default function VendorDashboard({ tenantId, vendorId }: VendorDashboardProps) {
    const [dashboard, setDashboard] = useState<any>(null);
    const [orders, setOrders] = useState<VendorOrder[]>([]);
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products'>('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashRes, ordersRes, productsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/shop/${tenantId}/vendors/${vendorId}/dashboard`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/vendors/${vendorId}/orders`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/vendors/${vendorId}/products`),
                ]);

                const dashData = await dashRes.json();
                const ordersData = await ordersRes.json();
                const productsData = await productsRes.json();

                if (dashData.success) setDashboard(dashData.data);
                if (ordersData.success) setOrders(ordersData.data);
                if (productsData.success) setProducts(productsData.data);
            } catch (error) {
                console.error('Failed to fetch vendor data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId, vendorId]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl animate-pulse">🏪</span>
            </div>
        );
    }

    if (!dashboard) return null;

    const vendor = dashboard.vendor;

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                        🏪
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{vendor.name}</h1>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${vendor.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}>
                            {vendor.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">
                            EGP {(vendor.totalSales / 100).toFixed(0)}
                        </div>
                        <div className="text-sm opacity-80">Total Sales</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">{vendor.totalProducts}</div>
                        <div className="text-sm opacity-80">Products</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">
                            EGP {(dashboard.pendingPayout / 100).toFixed(0)}
                        </div>
                        <div className="text-sm opacity-80">Pending Payout</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">{vendor.commissionRate}%</div>
                        <div className="text-sm opacity-80">Commission</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {(['overview', 'orders', 'products'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === tab
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-4">📊 Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">This Week Orders</span>
                                <span className="font-bold">{dashboard.recentOrdersCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Paid Out</span>
                                <span className="font-bold text-green-600">
                                    EGP {(dashboard.paidPayout / 100).toFixed(0)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Rating</span>
                                <span className="font-bold">⭐ {vendor.rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-4">🔗 Your Store Link</h3>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm break-all">
                            https://store.example.com/{tenantId}/store/{vendor.slug}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No orders yet</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-4">Order</th>
                                    <th className="text-right p-4">Subtotal</th>
                                    <th className="text-right p-4">Commission</th>
                                    <th className="text-right p-4">Your Payout</th>
                                    <th className="text-center p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} className="border-t">
                                        <td className="p-4 font-semibold">{order.orderCode || `#${order.id}`}</td>
                                        <td className="p-4 text-right">EGP {(order.subtotal / 100).toFixed(0)}</td>
                                        <td className="p-4 text-right text-red-500">-EGP {(order.commission / 100).toFixed(0)}</td>
                                        <td className="p-4 text-right text-green-600 font-bold">
                                            EGP {(order.payout / 100).toFixed(0)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'products' && (
                <div className="grid grid-cols-3 gap-4">
                    {products.length === 0 ? (
                        <div className="col-span-3 text-center py-12 text-gray-500">No products yet</div>
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="bg-white rounded-xl p-4 shadow-md">
                                <div className="h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-3xl">
                                    📦
                                </div>
                                <h4 className="font-semibold text-gray-900">{product.name}</h4>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span className="text-gray-500">Stock: {product.stock}</span>
                                    {product.price && (
                                        <span className="text-indigo-600 font-bold">
                                            EGP {(product.price / 100).toFixed(0)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
