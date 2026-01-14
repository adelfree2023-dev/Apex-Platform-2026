'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface LoyaltyAccount {
    points: number;
    lifetimePoints: number;
    tier: string;
}

interface Reward {
    id: number;
    name: string;
    description: string;
    pointsCost: number;
    type: string;
    value: number;
}

interface LoyaltyDashboardProps {
    tenantId: string;
    customerId: number;
}

export default function LoyaltyDashboard({ tenantId, customerId }: LoyaltyDashboardProps) {
    const [account, setAccount] = useState<LoyaltyAccount | null>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<number | null>(null);

    const tierColors: Record<string, string> = {
        Bronze: 'from-orange-400 to-orange-600',
        Silver: 'from-gray-300 to-gray-500',
        Gold: 'from-yellow-400 to-yellow-600',
        Platinum: 'from-slate-600 to-slate-900',
    };

    const tierIcons: Record<string, string> = {
        Bronze: '🥉',
        Silver: '🥈',
        Gold: '🥇',
        Platinum: '💎',
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accountRes, rewardsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/shop/${tenantId}/customers/${customerId}/loyalty`),
                    fetch(`${API_BASE}/api/shop/${tenantId}/loyalty/rewards`),
                ]);

                const accountData = await accountRes.json();
                const rewardsData = await rewardsRes.json();

                if (accountData.success) setAccount(accountData.data);
                if (rewardsData.success) setRewards(rewardsData.data);
            } catch (error) {
                console.error('Failed to fetch loyalty data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId, customerId]);

    const handleRedeem = async (rewardId: number) => {
        if (!account) return;
        setRedeeming(rewardId);

        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/loyalty/redeem`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rewardId }),
                }
            );

            const data = await res.json();
            if (data.success) {
                alert(`🎉 Reward redeemed!\nYour code: ${data.data.code}`);
                // Refresh account
                const accountRes = await fetch(
                    `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/loyalty`
                );
                const accountData = await accountRes.json();
                if (accountData.success) setAccount(accountData.data);
            } else {
                alert(data.message || 'Redemption failed');
            }
        } catch (error) {
            console.error('Redemption error:', error);
        } finally {
            setRedeeming(null);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl animate-pulse">🌟</span>
            </div>
        );
    }

    if (!account) return null;

    const tier = account.tier || 'Bronze';

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Account Card */}
            <div className={`bg-gradient-to-br ${tierColors[tier]} rounded-2xl p-6 text-white mb-8`}>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-4xl">{tierIcons[tier]}</span>
                        <h2 className="text-2xl font-bold mt-2">{tier} Member</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-bold">{account.points}</div>
                        <div className="text-white/80">Available Points</div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="text-sm text-white/80">
                        Lifetime Points: {account.lifetimePoints}
                    </div>
                </div>
            </div>

            {/* Rewards */}
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🎁</span> Redeem Rewards
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => {
                    const canRedeem = account.points >= reward.pointsCost;

                    return (
                        <div
                            key={reward.id}
                            className={`bg-white rounded-xl p-4 shadow-md border-2 ${canRedeem ? 'border-green-200' : 'border-gray-100 opacity-60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-gray-900">{reward.name}</h4>
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm font-semibold">
                                    {reward.pointsCost} pts
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mb-3">{reward.description}</p>
                            <button
                                onClick={() => handleRedeem(reward.id)}
                                disabled={!canRedeem || redeeming === reward.id}
                                className={`w-full py-2 rounded-lg font-semibold transition-all ${canRedeem
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    } disabled:opacity-50`}
                            >
                                {redeeming === reward.id ? '⏳...' : canRedeem ? 'Redeem' : 'Not Enough Points'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
