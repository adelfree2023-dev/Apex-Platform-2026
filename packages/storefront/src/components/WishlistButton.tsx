'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface WishlistButtonProps {
    tenantId: string;
    customerId: number;
    productId: number;
    initialState?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function WishlistButton({
    tenantId,
    customerId,
    productId,
    initialState = false,
    size = 'md'
}: WishlistButtonProps) {
    const [inWishlist, setInWishlist] = useState(initialState);
    const [loading, setLoading] = useState(false);

    const sizeClasses = {
        sm: 'p-1.5 text-lg',
        md: 'p-2 text-xl',
        lg: 'p-3 text-2xl',
    };

    const handleToggle = async () => {
        setLoading(true);

        try {
            if (inWishlist) {
                // Remove from wishlist
                await fetch(
                    `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/wishlist/${productId}`,
                    { method: 'DELETE' }
                );
                setInWishlist(false);
            } else {
                // Add to wishlist
                await fetch(
                    `${API_BASE}/api/shop/${tenantId}/customers/${customerId}/wishlist`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId }),
                    }
                );
                setInWishlist(true);
            }
        } catch (error) {
            console.error('Wishlist error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`
        ${sizeClasses[size]}
        rounded-full transition-all
        ${inWishlist
                    ? 'bg-red-100 text-red-500 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400'
                }
        disabled:opacity-50
      `}
            title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
            {loading ? (
                <span className="animate-spin">⏳</span>
            ) : (
                <span>{inWishlist ? '❤️' : '🤍'}</span>
            )}
        </button>
    );
}
