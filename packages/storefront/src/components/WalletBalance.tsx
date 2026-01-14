'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface WalletData {
    id: number;
    customer_id: number;
    balance: number;
    currency: string;
}

interface Transaction {
    id: number;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

export default function WalletBalance({ customerId }: { customerId: number }) {
    const params = useParams();
    const tenantId = params.tenantId as string;

    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddFunds, setShowAddFunds] = useState(false);
    const [amount, setAmount] = useState('');
    const [giftCode, setGiftCode] = useState('');
    const [message, setMessage] = useState('');

    const fetchWallet = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/wallet/${customerId}`);
            const data = await res.json();
            if (data.success) {
                setWallet(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch wallet:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/wallet/${customerId}/transactions`);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchWallet();
            await fetchTransactions();
            setLoading(false);
        };
        loadData();
    }, [tenantId, customerId]);

    const handleAddFunds = async () => {
        const amountValue = parseInt(amount, 10) * 100; // Convert to cents
        if (!amountValue || amountValue <= 0) {
            setMessage('Please enter a valid amount');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/wallet/${customerId}/add-funds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountValue }),
            });
            const data = await res.json();
            if (data.success) {
                setWallet(data.data);
                setAmount('');
                setShowAddFunds(false);
                setMessage('✅ Funds added successfully!');
                fetchTransactions();
            }
        } catch (error) {
            setMessage('❌ Failed to add funds');
        }
    };

    const handleRedeemGiftCard = async () => {
        if (!giftCode.trim()) {
            setMessage('Please enter a gift card code');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/gift-cards/${giftCode}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId }),
            });
            const data = await res.json();
            if (data.success) {
                setWallet(data.data.wallet);
                setGiftCode('');
                setMessage('🎁 Gift card redeemed successfully!');
                fetchTransactions();
            } else {
                setMessage(`❌ ${data.message || 'Failed to redeem gift card'}`);
            }
        } catch (error) {
            setMessage('❌ Failed to redeem gift card');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                <span className="text-3xl animate-spin inline-block">⏳</span>
                <p className="mt-2 text-gray-500">Loading wallet...</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg">
            {/* Wallet Balance */}
            <div className="text-center mb-6">
                <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 p-1 rounded-full">
                    <div className="bg-white rounded-full p-4">
                        <span className="text-4xl">💳</span>
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-4">Your Wallet</h2>
                <div className="mt-2">
                    <span className="text-4xl font-bold text-green-600">
                        EGP {((wallet?.balance || 0) / 100).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className="mb-4 p-3 bg-white rounded-xl text-center text-sm">
                    {message}
                </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setShowAddFunds(!showAddFunds)}
                    className="bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                    💵 Add Funds
                </button>
                <button
                    onClick={() => setShowAddFunds(false)}
                    className="bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600 transition-colors"
                >
                    🎁 Redeem Gift Card
                </button>
            </div>

            {/* Add Funds Form */}
            {showAddFunds && (
                <div className="bg-white p-4 rounded-xl mb-4">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount in EGP"
                        className="w-full p-3 border rounded-lg mb-3"
                    />
                    <button
                        onClick={handleAddFunds}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                    >
                        Add EGP {amount || '0'}
                    </button>
                </div>
            )}

            {/* Gift Card Form */}
            {!showAddFunds && (
                <div className="bg-white p-4 rounded-xl mb-4">
                    <input
                        type="text"
                        value={giftCode}
                        onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                        placeholder="Enter gift card code"
                        className="w-full p-3 border rounded-lg mb-3 font-mono"
                    />
                    <button
                        onClick={handleRedeemGiftCard}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
                    >
                        Redeem Gift Card
                    </button>
                </div>
            )}

            {/* Transactions */}
            {transactions.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Transactions</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center justify-between bg-white p-3 rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={tx.type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                                        {tx.type === 'credit' ? '↓' : '↑'}
                                    </span>
                                    <span className="text-sm text-gray-600">{tx.description}</span>
                                </div>
                                <span className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}EGP {(tx.amount / 100).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
