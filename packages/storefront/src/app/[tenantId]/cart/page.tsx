'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CartItem from '@/components/CartItem';
import { Cart, getCart, removeFromCart, checkout } from '@/lib/api';

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.tenantId as string;

    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [email, setEmail] = useState('');

    // Generate or get session ID
    const getSessionId = () => {
        if (typeof window !== 'undefined') {
            let sessionId = localStorage.getItem('apex_session_id');
            if (!sessionId) {
                sessionId = 'session_' + Date.now();
                localStorage.setItem('apex_session_id', sessionId);
            }
            return sessionId;
        }
        return 'session_' + Date.now();
    };

    useEffect(() => {
        const fetchCart = async () => {
            try {
                const sessionId = getSessionId();
                const response = await getCart(tenantId, sessionId);
                setCart(response.data);
            } catch (error) {
                console.error('Failed to fetch cart:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, [tenantId]);

    const handleRemove = async (itemId: number) => {
        try {
            await removeFromCart(tenantId, itemId);
            // Refresh cart
            const sessionId = getSessionId();
            const response = await getCart(tenantId, sessionId);
            setCart(response.data);
        } catch (error) {
            console.error('Failed to remove item:', error);
        }
    };

    const handleCheckout = async () => {
        if (!email) {
            alert('Please enter your email');
            return;
        }

        setCheckingOut(true);
        try {
            const sessionId = getSessionId();
            const order = await checkout(tenantId, sessionId, email);
            router.push(`/${tenantId}/checkout/success?orderId=${order.data.id}&code=${order.data.code}`);
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Checkout failed. Please try again.');
        } finally {
            setCheckingOut(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Header />
                <div className="flex items-center justify-center h-64">
                    <span className="text-2xl">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header cartItemCount={cart?.itemCount || 0} />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

                {!cart || cart.items.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                        <span className="text-6xl mb-4 block">🛒</span>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
                        <p className="text-gray-500 mb-6">Add some products to get started!</p>
                        <a
                            href={`/${tenantId}`}
                            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Browse Products
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cart.items.map((item) => (
                                <CartItem key={item.id} item={item} onRemove={handleRemove} />
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>EGP {(cart.subtotal / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span>Free</span>
                                </div>
                                <div className="border-t pt-3">
                                    <div className="flex justify-between font-bold text-xl">
                                        <span>Total</span>
                                        <span className="text-indigo-600">EGP {(cart.total / 100).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Email Input */}
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />

                            <button
                                onClick={handleCheckout}
                                disabled={checkingOut}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {checkingOut ? 'Processing...' : 'Checkout'}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
