'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface RfqItem {
    productId: number;
    productName: string;
    quantity: number;
}

interface RfqFormProps {
    tenantId: string;
    products?: { id: number; name: string }[];
    onSuccess?: () => void;
}

export default function RfqForm({ tenantId, products = [], onSuccess }: RfqFormProps) {
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [message, setMessage] = useState('');
    const [items, setItems] = useState<RfqItem[]>([{ productId: 0, productName: '', quantity: 1 }]);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const addItem = () => {
        setItems([...items, { productId: 0, productName: '', quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof RfqItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/rfq`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName,
                    customerEmail,
                    customerPhone,
                    companyName,
                    message,
                    items: items.filter(i => i.productId > 0),
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                onSuccess?.();
            }
        } catch (error) {
            console.error('RFQ submission failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-12 bg-green-50 rounded-2xl">
                <span className="text-6xl mb-4 block">✅</span>
                <h2 className="text-2xl font-bold text-green-700 mb-2">Quote Request Submitted!</h2>
                <p className="text-green-600">We'll get back to you within 24-48 hours.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span>📋</span> Request a Quote
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            required
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            required
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Products */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Products *</label>
                    <div className="space-y-3">
                        {items.map((item, i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <select
                                    value={item.productId}
                                    onChange={(e) => updateItem(i, 'productId', parseInt(e.target.value))}
                                    className="flex-1 p-3 border rounded-xl"
                                >
                                    <option value={0}>Select product...</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value))}
                                    min={1}
                                    className="w-24 p-3 border rounded-xl text-center"
                                    placeholder="Qty"
                                />
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                        + Add another product
                    </button>
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                        placeholder="Any special requirements..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || !customerName || !customerEmail}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                    {submitting ? '⏳ Submitting...' : '📤 Submit Quote Request'}
                </button>
            </form>
        </div>
    );
}
