'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface Order {
    id: number;
    code: string;
    state: string;
    total: number;
    created_at: string;
    customer_email?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

const statusColors: { [key: string]: string } = {
    AddingItems: 'bg-gray-500',
    PaymentPending: 'bg-yellow-500',
    PaymentAuthorized: 'bg-blue-500',
    Processing: 'bg-indigo-500',
    Shipped: 'bg-purple-500',
    Delivered: 'bg-green-500',
    Cancelled: 'bg-red-500',
    Refunded: 'bg-orange-500',
};

const statusIcons: { [key: string]: string } = {
    AddingItems: '🛒',
    PaymentPending: '⏳',
    PaymentAuthorized: '✓',
    Processing: '⚙️',
    Shipped: '📦',
    Delivered: '✅',
    Cancelled: '❌',
    Refunded: '↩️',
};

export default function OrdersPage() {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.tenantId as string;

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const sessionId = localStorage.getItem('apex_session_id');
                const res = await fetch(`${API_BASE}/api/admin/tenants/${tenantId}/orders`);
                const data = await res.json();
                if (data.success) {
                    setOrders(data.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Header />
                <div className="flex items-center justify-center py-20">
                    <span className="text-4xl animate-spin">⏳</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span>📋</span> My Orders
                </h1>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                        <span className="text-6xl mb-4 block">📦</span>
                        <h2 className="text-xl font-bold text-gray-700 mb-2">No orders yet</h2>
                        <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
                        <button
                            onClick={() => router.push(`/${tenantId}`)}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700"
                        >
                            Browse Products
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => router.push(`/${tenantId}/orders/${order.id}`)}
                                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Order #{order.code}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            EGP {(order.total / 100).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className={`${statusColors[order.state] || 'bg-gray-500'} text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2`}>
                                        <span>{statusIcons[order.state] || '📋'}</span>
                                        <span>{order.state}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <span>{new Date(order.created_at).toLocaleDateString('en-EG', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                    <span className="text-indigo-600">View Details →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
