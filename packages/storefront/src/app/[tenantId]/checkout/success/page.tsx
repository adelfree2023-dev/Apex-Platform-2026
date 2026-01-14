'use client';

import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CheckoutSuccessPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const tenantId = params.tenantId as string;

    const orderId = searchParams.get('orderId');
    const orderCode = searchParams.get('code');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header />

            <main className="max-w-2xl mx-auto px-4 py-16">
                <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
                    {/* Success Icon */}
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <span className="text-5xl">✅</span>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Order Confirmed!
                    </h1>

                    <p className="text-xl text-gray-600 mb-8">
                        Thank you for your purchase
                    </p>

                    {/* Order Details */}
                    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div>
                                <span className="text-gray-500 text-sm">Order ID</span>
                                <p className="font-bold text-gray-900">{orderId}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-sm">Order Code</span>
                                <p className="font-bold text-indigo-600">{orderCode}</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-600 mb-8">
                        You will receive an email confirmation shortly.
                    </p>

                    <Link
                        href={`/${tenantId}`}
                        className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </main>
        </div>
    );
}
