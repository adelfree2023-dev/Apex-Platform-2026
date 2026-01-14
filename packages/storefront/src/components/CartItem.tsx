'use client';

import { CartItem as CartItemType } from '@/lib/api';

interface CartItemProps {
    item: CartItemType;
    onRemove: (itemId: number) => void;
}

export default function CartItem({ item, onRemove }: CartItemProps) {
    return (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center space-x-4">
                {/* Item Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                </div>

                {/* Item Details */}
                <div>
                    <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                    <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                    <p className="text-indigo-600 font-bold">
                        EGP {(item.unit_price / 100).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900">
                    EGP {((item.unit_price * item.quantity) / 100).toFixed(2)}
                </span>
                <button
                    onClick={() => onRemove(item.id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}
