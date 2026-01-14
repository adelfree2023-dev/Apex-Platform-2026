'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface AffiliateDashboardProps {
    tenantId: string;
    affiliateId: number;
}

interface Referral {
    id: number;
    orderId: number;
    orderTotal: number;
    commission: number;
    status: string;
    createdAt: string;
}

export default function AffiliateDashboard({ tenantId, affiliateId }: AffiliateDashboardProps) {
    const [stats, setStats] = useState<any>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, referralsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/shop/${tenantId}/affiliates/${affiliateId}/dashboard`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/affiliates/${affiliateId}/referrals`),
                ]);

                const statsData = await statsRes.json();
                const referralsData = await referralsRes.json();

                if (statsData.success) setStats(statsData.data);
                if (referralsData.success) setReferrals(referralsData.data);
            } catch (error) {
                console.error('Failed to fetch affiliate data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId, affiliateId]);

    const copyLink = () => {
        if (stats?.referralLink) {
            navigator.clipboard.writeText(stats.referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl animate-pulse">💰</span>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white mb-8">
                <h2 className="text-xl font-bold mb-4">🤝 Affiliate Dashboard</h2>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">{stats.affiliate.totalReferrals}</div>
                        <div className="text-sm opacity-80">Total Referrals</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">
                            EGP {(stats.pendingCommission / 100).toFixed(0)}
                        </div>
                        <div className="text-sm opacity-80">Pending</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold">
                            EGP {(stats.paidCommission / 100).toFixed(0)}
                        </div>
                        <div className="text-sm opacity-80">Paid Out</div>
                    </div>
                </div>

                {/* Referral Link */}
                <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-sm opacity-80 mb-2">Your Referral Link</div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={stats.referralLink}
                            readOnly
                            className="flex-1 bg-white/20 rounded-lg px-4 py-2 text-white"
                        />
                        <button
                            onClick={copyLink}
                            className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50"
                        >
                            {copied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-xl p-4 shadow-md mb-8">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Commission Rate:</span>
                        <span className="font-bold text-green-600 ml-2">{stats.affiliate.commissionRate}%</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${stats.affiliate.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {stats.affiliate.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Referrals */}
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Recent Referrals</h3>

            {referrals.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-500">
                    No referrals yet. Share your link to start earning!
                </div>
            ) : (
                <div className="space-y-3">
                    {referrals.map((r) => (
                        <div key={r.id} className="bg-white rounded-xl p-4 shadow-md flex justify-between items-center">
                            <div>
                                <div className="font-semibold">Order #{r.orderId}</div>
                                <div className="text-sm text-gray-500">
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-500 text-sm">
                                    Order: EGP {(r.orderTotal / 100).toFixed(0)}
                                </div>
                                <div className="text-green-600 font-bold">
                                    +EGP {(r.commission / 100).toFixed(0)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
