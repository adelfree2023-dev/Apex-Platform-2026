'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

interface OverviewStats {
    products: number;
    orders: number;
    customers: number;
    revenue: number;
    avgOrderValue: number;
}

interface OrderStatus {
    state: string;
    count: number;
}

interface TopProduct {
    id: number;
    name: string;
    total_sold: number;
    total_revenue: number;
}

interface RecentOrder {
    id: number;
    code: string;
    state: string;
    total: number;
    created_at: string;
    customer_email: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

const statusColors: { [key: string]: string } = {
    AddingItems: 'bg-gray-400',
    PaymentPending: 'bg-yellow-400',
    PaymentAuthorized: 'bg-blue-400',
    Processing: 'bg-indigo-500',
    Shipped: 'bg-purple-500',
    Delivered: 'bg-green-500',
    Cancelled: 'bg-red-500',
    Refunded: 'bg-orange-500',
};

export default function AnalyticsDashboard() {
    const params = useParams();
    const tenantId = params.tenantId as string;

    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [ordersByStatus, setOrdersByStatus] = useState<OrderStatus[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [walletStats, setWalletStats] = useState<any>(null);
    const [conversionMetrics, setConversionMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Fetch all analytics data in parallel
                const [statsRes, statusRes, productsRes, ordersRes, walletRes, conversionRes] = await Promise.all([
                    fetch(`${API_BASE}/api/shop/${tenantId}/analytics`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/analytics/orders-by-status`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/analytics/top-products?limit=5`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/analytics/recent-orders?limit=5`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/analytics/wallet`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/analytics/conversion`),
                ]);

                const [statsData, statusData, productsData, ordersData, walletData, conversionData] = await Promise.all([
                    statsRes.json(),
                    statusRes.json(),
                    productsRes.json(),
                    ordersRes.json(),
                    walletRes.json(),
                    conversionRes.json(),
                ]);

                if (statsData.success) setStats(statsData.data);
                if (statusData.success) setOrdersByStatus(statusData.data);
                if (productsData.success) setTopProducts(productsData.data);
                if (ordersData.success) setRecentOrders(ordersData.data);
                if (walletData.success) setWalletStats(walletData.data);
                if (conversionData.success) setConversionMetrics(conversionData.data);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Header />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <span className="text-6xl animate-spin inline-block">📊</span>
                        <p className="mt-4 text-xl text-gray-600">Loading Analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                    <span>📊</span> Analytics Dashboard
                </h1>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard
                        icon="📦"
                        label="Products"
                        value={stats?.products || 0}
                        color="from-blue-500 to-blue-600"
                    />
                    <StatCard
                        icon="🛒"
                        label="Orders"
                        value={stats?.orders || 0}
                        color="from-purple-500 to-purple-600"
                    />
                    <StatCard
                        icon="👥"
                        label="Customers"
                        value={stats?.customers || 0}
                        color="from-pink-500 to-pink-600"
                    />
                    <StatCard
                        icon="💰"
                        label="Revenue"
                        value={`EGP ${((stats?.revenue || 0) / 100).toFixed(0)}`}
                        color="from-green-500 to-emerald-600"
                    />
                    <StatCard
                        icon="📈"
                        label="Avg Order"
                        value={`EGP ${((stats?.avgOrderValue || 0) / 100).toFixed(0)}`}
                        color="from-yellow-500 to-orange-500"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Order Status Distribution */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>📋</span> Orders by Status
                        </h2>
                        {ordersByStatus.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No order data available</p>
                        ) : (
                            <div className="space-y-3">
                                {ordersByStatus.map((item) => (
                                    <div key={item.state} className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${statusColors[item.state] || 'bg-gray-400'}`} />
                                        <span className="text-white flex-1">{item.state}</span>
                                        <span className="text-white font-bold">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Conversion Metrics */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🎯</span> Conversion Metrics
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">{conversionMetrics?.cartsCreated || 0}</div>
                                <div className="text-gray-400 text-sm">Carts Created</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400">{conversionMetrics?.ordersCompleted || 0}</div>
                                <div className="text-gray-400 text-sm">Orders Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400">{conversionMetrics?.conversionRate || 0}%</div>
                                <div className="text-gray-400 text-sm">Conversion Rate</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Top Products */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🏆</span> Top Selling Products
                        </h2>
                        {topProducts.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No product data available</p>
                        ) : (
                            <div className="space-y-3">
                                {topProducts.map((product, index) => (
                                    <div key={product.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                        <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦'}</span>
                                        <div className="flex-1">
                                            <p className="text-white font-semibold">{product.name}</p>
                                            <p className="text-gray-400 text-sm">{product.total_sold} sold</p>
                                        </div>
                                        <span className="text-green-400 font-bold">
                                            EGP {(product.total_revenue / 100).toFixed(0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Wallet Stats */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>💳</span> Wallet & Gift Cards
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">
                                    EGP {((walletStats?.totalWalletBalance || 0) / 100).toFixed(0)}
                                </div>
                                <div className="text-gray-400 text-sm">Total Wallet Balance</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-400">
                                    {walletStats?.activeGiftCards || 0}
                                </div>
                                <div className="text-gray-400 text-sm">Active Gift Cards</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-yellow-400">
                                    EGP {((walletStats?.giftCardValue || 0) / 100).toFixed(0)}
                                </div>
                                <div className="text-gray-400 text-sm">Gift Card Value</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">
                                    {walletStats?.redeemedGiftCards || 0}
                                </div>
                                <div className="text-gray-400 text-sm">Redeemed Cards</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🕐</span> Recent Orders
                    </h2>
                    {recentOrders.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No orders yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-white/10">
                                        <th className="pb-3">Order</th>
                                        <th className="pb-3">Customer</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Total</th>
                                        <th className="pb-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order) => (
                                        <tr key={order.id} className="border-b border-white/5">
                                            <td className="py-3 text-white font-mono">{order.code}</td>
                                            <td className="py-3 text-gray-300">{order.customer_email || 'Guest'}</td>
                                            <td className="py-3">
                                                <span className={`${statusColors[order.state] || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded-full`}>
                                                    {order.state}
                                                </span>
                                            </td>
                                            <td className="py-3 text-green-400 font-semibold">
                                                EGP {(order.total / 100).toFixed(2)}
                                            </td>
                                            <td className="py-3 text-gray-400 text-sm">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
    return (
        <div className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white shadow-lg`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{icon}</span>
                <span className="text-sm opacity-80">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}
