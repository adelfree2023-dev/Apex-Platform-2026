'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tenant {
    id: string;
    name: string;
    territory: string;
    businessType: string;
    createdAt: string;
}

interface PlatformStats {
    tenants: number;
    products: number;
    orders: number;
    revenue: number;
    customers: number;
}

interface TenantStats {
    products: number;
    orders: number;
    revenue: number;
    customers: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

export default function AdminDashboard() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [tenantStats, setTenantStats] = useState<{ [key: string]: TenantStats }>({});
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch platform stats
                const statsRes = await fetch(`${API_BASE}/api/admin/stats`);
                const statsData = await statsRes.json();
                if (statsData.success) {
                    setPlatformStats(statsData.data);
                }

                // Fetch tenants
                const tenantsRes = await fetch(`${API_BASE}/api/admin/tenants`);
                const tenantsData = await tenantsRes.json();
                if (tenantsData.success) {
                    setTenants(tenantsData.data || []);

                    // Fetch stats for each tenant
                    for (const tenant of tenantsData.data || []) {
                        const tenantStatsRes = await fetch(`${API_BASE}/api/admin/tenants/${tenant.id}/stats`);
                        const tenantStatsData = await tenantStatsRes.json();
                        if (tenantStatsData.success) {
                            setTenantStats(prev => ({ ...prev, [tenant.id]: tenantStatsData.data }));
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch admin data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-6xl animate-spin inline-block">⚙️</span>
                    <p className="mt-4 text-xl text-gray-600">Loading Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🏛️</span>
                        <h1 className="text-2xl font-bold text-white">Apex Admin</h1>
                    </div>
                    <nav className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm">Platform Overview</span>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Platform Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard
                        icon="🏪"
                        label="Tenants"
                        value={platformStats?.tenants || 0}
                        color="blue"
                    />
                    <StatCard
                        icon="📦"
                        label="Products"
                        value={platformStats?.products || 0}
                        color="purple"
                    />
                    <StatCard
                        icon="🛒"
                        label="Orders"
                        value={platformStats?.orders || 0}
                        color="green"
                    />
                    <StatCard
                        icon="💰"
                        label="Revenue"
                        value={`EGP ${((platformStats?.revenue || 0) / 100).toFixed(0)}`}
                        color="yellow"
                    />
                    <StatCard
                        icon="👥"
                        label="Customers"
                        value={platformStats?.customers || 0}
                        color="pink"
                    />
                </div>

                {/* Tenants Section */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🏪</span> Registered Tenants
                    </h2>

                    {tenants.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">🏗️</span>
                            <p className="text-slate-400">No tenants registered yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tenants.map((tenant) => (
                                <TenantCard
                                    key={tenant.id}
                                    tenant={tenant}
                                    stats={tenantStats[tenant.id]}
                                    isSelected={selectedTenant === tenant.id}
                                    onSelect={() => setSelectedTenant(tenant.id === selectedTenant ? null : tenant.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
    const colorClasses: { [key: string]: string } = {
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600',
        yellow: 'from-yellow-500 to-orange-500',
        pink: 'from-pink-500 to-rose-500',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{icon}</span>
                <span className="text-sm opacity-80">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}

function TenantCard({ tenant, stats, isSelected, onSelect }: {
    tenant: Tenant;
    stats?: TenantStats;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <div
            className={`bg-slate-700/50 rounded-xl overflow-hidden border transition-all cursor-pointer ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-600 hover:border-slate-500'
                }`}
            onClick={onSelect}
        >
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">{tenant.name}</h3>
                    <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded-full">
                        {tenant.businessType}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>📍</span>
                    <span>{tenant.territory}</span>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-white">{stats.products}</div>
                            <div className="text-slate-400 text-xs">Products</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-white">{stats.orders}</div>
                            <div className="text-slate-400 text-xs">Orders</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-green-400">EGP {(stats.revenue / 100).toFixed(0)}</div>
                            <div className="text-slate-400 text-xs">Revenue</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-white">{stats.customers}</div>
                            <div className="text-slate-400 text-xs">Customers</div>
                        </div>
                    </div>
                )}
            </div>

            {isSelected && (
                <div className="border-t border-slate-600 p-3 bg-slate-800/30">
                    <Link
                        href={`/${tenant.id}`}
                        className="block w-full text-center bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        View Storefront →
                    </Link>
                </div>
            )}
        </div>
    );
}
