'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface DashboardData {
    revenue: {
        today: { revenue: number; orders: number };
        thisWeek: { revenue: number; orders: number };
        thisMonth: { revenue: number; orders: number };
        lastMonth: { revenue: number; orders: number };
        monthOverMonthGrowth: string | number;
    };
    segments: { segment: string; count: number; revenue: number; percentage: string }[];
    trends: { period: string; orders: number; revenue: number }[];
    topProducts: { id: number; name: string; unitsSold: number; totalRevenue: number; avgRating: number }[];
    abandonment: { totalCarts: number; abandonedCarts: number; conversionRate: string };
}

interface AdvancedAnalyticsDashboardProps {
    tenantId: string;
}

export default function AdvancedAnalyticsDashboard({ tenantId }: AdvancedAnalyticsDashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/shop/${tenantId}/advanced-analytics/dashboard`
                );
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="text-5xl animate-spin">📊</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <span className="text-5xl">😕</span>
                <p className="mt-4 text-gray-500">Failed to load analytics</p>
            </div>
        );
    }

    const formatMoney = (cents: number) => `EGP ${(cents / 100).toLocaleString()}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <span>📊</span> Advanced Analytics Dashboard
            </h1>

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <div className="text-white/60 text-sm mb-2">Today</div>
                    <div className="text-3xl font-bold text-white">
                        {formatMoney(data.revenue.today.revenue)}
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                        {data.revenue.today.orders} orders
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <div className="text-white/60 text-sm mb-2">This Week</div>
                    <div className="text-3xl font-bold text-white">
                        {formatMoney(data.revenue.thisWeek.revenue)}
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                        {data.revenue.thisWeek.orders} orders
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <div className="text-white/60 text-sm mb-2">This Month</div>
                    <div className="text-3xl font-bold text-white">
                        {formatMoney(data.revenue.thisMonth.revenue)}
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                        {data.revenue.thisMonth.orders} orders
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
                    <div className="text-green-300 text-sm mb-2">Month Growth</div>
                    <div className="text-3xl font-bold text-green-400">
                        {Number(data.revenue.monthOverMonthGrowth) >= 0 ? '+' : ''}
                        {data.revenue.monthOverMonthGrowth}%
                    </div>
                    <div className="text-green-300/60 text-sm mt-1">vs last month</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Customer Segments */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>👥</span> Customer Segments (RFM)
                    </h2>
                    <div className="space-y-3">
                        {data.segments.length === 0 ? (
                            <p className="text-white/50">No customer data yet</p>
                        ) : (
                            data.segments.map((seg, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-3 h-3 rounded-full ${seg.segment === 'Champion' ? 'bg-yellow-400' :
                                                seg.segment === 'Loyal Customer' ? 'bg-green-400' :
                                                    seg.segment === 'At Risk' ? 'bg-red-400' :
                                                        seg.segment === 'Lost' ? 'bg-gray-400' :
                                                            'bg-blue-400'
                                            }`} />
                                        <span className="text-white">{seg.segment}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-white font-semibold">{seg.count}</span>
                                        <span className="text-white/50 text-sm ml-2">({seg.percentage}%)</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Conversion Metrics */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>🎯</span> Conversion Metrics
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-green-400">
                                {data.abandonment.conversionRate}%
                            </div>
                            <div className="text-white/60 text-sm mt-1">Conversion Rate</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-orange-400">
                                {data.abandonment.abandonedCarts}
                            </div>
                            <div className="text-white/60 text-sm mt-1">Abandoned Carts</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Products */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>🏆</span> Top Products
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-white">
                        <thead>
                            <tr className="text-white/60 text-left border-b border-white/10">
                                <th className="pb-3">Product</th>
                                <th className="pb-3 text-right">Units Sold</th>
                                <th className="pb-3 text-right">Revenue</th>
                                <th className="pb-3 text-right">Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-4 text-center text-white/50">
                                        No product data yet
                                    </td>
                                </tr>
                            ) : (
                                data.topProducts.map((product, i) => (
                                    <tr key={product.id} className="border-b border-white/5">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-yellow-400">{i + 1}.</span>
                                                {product.name}
                                            </div>
                                        </td>
                                        <td className="py-3 text-right">{product.unitsSold}</td>
                                        <td className="py-3 text-right text-green-400">
                                            {formatMoney(product.totalRevenue)}
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-yellow-400">★</span> {product.avgRating.toFixed(1)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sales Trend */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📈</span> Sales Trend (7 Days)
                </h2>
                <div className="flex items-end justify-between h-40 gap-2">
                    {data.trends.length === 0 ? (
                        <p className="text-white/50 w-full text-center">No sales data yet</p>
                    ) : (
                        data.trends.map((day, i) => {
                            const maxRevenue = Math.max(...data.trends.map(t => t.revenue), 1);
                            const height = (day.revenue / maxRevenue) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div
                                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all"
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                    />
                                    <span className="text-white/50 text-xs">
                                        {day.period.split('-').pop()}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
