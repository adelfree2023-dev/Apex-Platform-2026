'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface OrderLine {
    id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
}

interface Fulfillment {
    id: number;
    tracking_code: string;
    carrier: string;
    shipped_at: string;
    delivered_at: string | null;
}

interface Order {
    id: number;
    code: string;
    state: string;
    total: number;
    subtotal: number;
    shipping: number;
    created_at: string;
    updated_at: string;
    customer_email?: string;
    lines: OrderLine[];
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

const statusSteps = ['PaymentAuthorized', 'Processing', 'Shipped', 'Delivered'];

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.tenantId as string;
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Get order details
                const orderRes = await fetch(`${API_BASE}/api/shop/${tenantId}/orders/${orderId}`);
                const orderData = await orderRes.json();
                if (orderData.success) {
                    setOrder(orderData.data);
                }

                // Get fulfillment
                const fulfillRes = await fetch(`${API_BASE}/api/shop/${tenantId}/orders/${orderId}/fulfillment`);
                const fulfillData = await fulfillRes.json();
                if (fulfillData.success && fulfillData.data) {
                    setFulfillment(fulfillData.data);
                }
            } catch (error) {
                console.error('Failed to fetch order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [tenantId, orderId]);

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

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Header />
                <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                    <span className="text-6xl mb-4 block">😕</span>
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">Order not found</h2>
                    <button
                        onClick={() => router.push(`/${tenantId}/orders`)}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold"
                    >
                        Back to Orders
                    </button>
                </div>
            </div>
        );
    }

    const currentStepIndex = statusSteps.indexOf(order.state);

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-500">Order</p>
                            <h1 className="text-2xl font-bold text-gray-900">{order.code}</h1>
                        </div>
                        <div className={`${statusColors[order.state] || 'bg-gray-500'} text-white px-6 py-3 rounded-full font-bold text-lg`}>
                            {order.state}
                        </div>
                    </div>

                    <p className="text-gray-500">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                {/* Progress Steps */}
                {order.state !== 'Cancelled' && order.state !== 'Refunded' && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Order Progress</h2>
                        <div className="flex items-center justify-between relative">
                            {/* Progress Line */}
                            <div className="absolute left-0 right-0 top-5 h-1 bg-gray-200">
                                <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${Math.max(0, (currentStepIndex / (statusSteps.length - 1)) * 100)}%` }}
                                />
                            </div>

                            {statusSteps.map((step, index) => {
                                const isComplete = index <= currentStepIndex;
                                const isCurrent = step === order.state;
                                return (
                                    <div key={step} className="relative z-10 flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                            } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}>
                                            {isComplete ? '✓' : index + 1}
                                        </div>
                                        <span className={`text-xs mt-2 ${isComplete ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                                            {step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tracking Info */}
                {fulfillment && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span>📦</span> Shipping Details
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Carrier</p>
                                <p className="font-semibold text-gray-900">{fulfillment.carrier}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Tracking Number</p>
                                <p className="font-semibold text-indigo-600">{fulfillment.tracking_code}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Shipped At</p>
                                <p className="font-semibold text-gray-900">
                                    {new Date(fulfillment.shipped_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Delivered At</p>
                                <p className="font-semibold text-gray-900">
                                    {fulfillment.delivered_at
                                        ? new Date(fulfillment.delivered_at).toLocaleDateString()
                                        : 'Pending'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Items */}
                <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>
                    <div className="space-y-4">
                        {order.lines.map((line) => (
                            <div key={line.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl">
                                        📦
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{line.product_name}</p>
                                        <p className="text-sm text-gray-500">Qty: {line.quantity}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-gray-900">
                                    EGP {((line.unit_price * line.quantity) / 100).toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-semibold">EGP {(order.subtotal / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Shipping</span>
                            <span className="font-semibold">
                                {order.shipping === 0 ? 'Free' : `EGP ${(order.shipping / 100).toFixed(2)}`}
                            </span>
                        </div>
                        <hr />
                        <div className="flex justify-between text-lg">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-green-600">EGP {(order.total / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Back Button */}
                <button
                    onClick={() => router.push(`/${tenantId}/orders`)}
                    className="mt-6 text-indigo-600 font-semibold hover:underline"
                >
                    ← Back to Orders
                </button>
            </main>
        </div>
    );
}
