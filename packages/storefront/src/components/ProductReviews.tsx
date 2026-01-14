'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface Review {
    id: number;
    customerName: string;
    rating: number;
    title: string;
    comment: string;
    isVerified: boolean;
    createdAt: string;
}

interface ProductReviewsProps {
    tenantId: string;
    productId: number;
}

export default function ProductReviews({ tenantId, productId }: ProductReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/shop/${tenantId}/products/${productId}/reviews`
                );
                const data = await res.json();
                if (data.success) {
                    setReviews(data.reviews || []);
                    setAvgRating(data.avgRating || 0);
                    setCount(data.count || 0);
                }
            } catch (error) {
                console.error('Failed to fetch reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [tenantId, productId]);

    const renderStars = (rating: number) => {
        return (
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-8">
                <span className="text-2xl animate-spin inline-block">⏳</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
            {/* Rating Summary */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900">
                        {avgRating.toFixed(1)}
                    </div>
                    <div className="text-2xl">{renderStars(Math.round(avgRating))}</div>
                    <div className="text-sm text-gray-500">{count} reviews</div>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((stars) => {
                        const starCount = reviews.filter((r) => r.rating === stars).length;
                        const percentage = count > 0 ? (starCount / count) * 100 : 0;
                        return (
                            <div key={stars} className="flex items-center gap-2 text-sm">
                                <span className="w-3">{stars}</span>
                                <span className="text-yellow-400">★</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="w-8 text-gray-500">{starCount}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
                <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">📝</span>
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-4 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                        {review.customerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{review.customerName}</span>
                                            {review.isVerified && (
                                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                                    ✓ Verified Purchase
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {renderStars(review.rating)}
                                            <span className="text-xs text-gray-400">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {review.title && (
                                <h4 className="font-semibold text-gray-900">{review.title}</h4>
                            )}
                            {review.comment && (
                                <p className="text-gray-600 text-sm mt-1">{review.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
