'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface CouponResult {
    valid: boolean;
    coupon?: {
        code: string;
        type: string;
        discount: number;
    };
    discount?: number;
    message?: string;
}

interface CouponInputProps {
    tenantId: string;
    orderTotal: number;
    onApply: (discount: number, code: string) => void;
}

export default function CouponInput({ tenantId, orderTotal, onApply }: CouponInputProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CouponResult | null>(null);
    const [applied, setApplied] = useState(false);

    const validateCoupon = async () => {
        if (!code.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/coupons/validate?code=${code}&total=${orderTotal}`
            );
            const data = await res.json();

            setResult(data);

            if (data.valid && data.discount) {
                setApplied(true);
                onApply(data.discount, code);
            }
        } catch (error) {
            setResult({ valid: false, message: 'Failed to validate coupon' });
        } finally {
            setLoading(false);
        }
    };

    const removeCoupon = () => {
        setCode('');
        setResult(null);
        setApplied(false);
        onApply(0, '');
    };

    if (applied && result?.valid) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎟️</span>
                        <div>
                            <p className="font-semibold text-green-700">{code.toUpperCase()} Applied!</p>
                            <p className="text-sm text-green-600">
                                You save EGP {((result.discount || 0) / 100).toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                        Remove
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Have a coupon code?
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                    disabled={loading}
                />
                <button
                    onClick={validateCoupon}
                    disabled={loading || !code.trim()}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {loading ? '...' : 'Apply'}
                </button>
            </div>

            {result && !result.valid && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <span>❌</span> {result.message}
                </p>
            )}
        </div>
    );
}
