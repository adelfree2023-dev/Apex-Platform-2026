'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface Plan {
    id: number;
    name: string;
    description: string;
    price: number;
    interval: string;
    features: string[];
}

interface SubscriptionPlansProps {
    tenantId: string;
    customerId: number;
    onSubscribe?: () => void;
}

export default function SubscriptionPlans({ tenantId, customerId, onSubscribe }: SubscriptionPlansProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState<number | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/shop/${tenantId}/subscriptions/plans`);
                const data = await res.json();
                if (data.success) {
                    setPlans(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch plans:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, [tenantId]);

    const handleSubscribe = async (planId: number) => {
        setSubscribing(planId);

        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, planId }),
            });

            const data = await res.json();
            if (data.success) {
                alert('Subscribed successfully!');
                onSubscribe?.();
            } else {
                alert(data.message || 'Subscription failed');
            }
        } catch (error) {
            console.error('Subscription error:', error);
        } finally {
            setSubscribing(null);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl animate-pulse">🔄</span>
            </div>
        );
    }

    const intervalLabels: Record<string, string> = {
        weekly: '/week',
        monthly: '/month',
        yearly: '/year',
    };

    return (
        <div className="py-8">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
                Choose Your Plan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.map((plan, index) => (
                    <div
                        key={plan.id}
                        className={`
              bg-white rounded-2xl p-6 shadow-lg border-2 transition-all
              ${index === 1 ? 'border-indigo-500 scale-105' : 'border-gray-100 hover:border-indigo-200'}
            `}
                    >
                        {index === 1 && (
                            <div className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                                MOST POPULAR
                            </div>
                        )}

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <p className="text-gray-500 text-sm mb-4">{plan.description}</p>

                        <div className="mb-6">
                            <span className="text-4xl font-bold text-gray-900">
                                EGP {(plan.price / 100).toFixed(0)}
                            </span>
                            <span className="text-gray-500">
                                {intervalLabels[plan.interval] || `/${plan.interval}`}
                            </span>
                        </div>

                        {plan.features && plan.features.length > 0 && (
                            <ul className="space-y-2 mb-6">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="text-green-500">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={subscribing === plan.id}
                            className={`
                w-full py-3 rounded-xl font-bold transition-all
                ${index === 1
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                }
                disabled:opacity-50
              `}
                        >
                            {subscribing === plan.id ? '⏳ Processing...' : 'Subscribe'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
