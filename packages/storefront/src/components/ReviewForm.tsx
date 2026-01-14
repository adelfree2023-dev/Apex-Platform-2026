'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface ReviewFormProps {
    tenantId: string;
    productId: number;
    customerId: number;
    onSuccess: () => void;
}

export default function ReviewForm({ tenantId, productId, customerId, onSuccess }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const submitReview = async () => {
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(
                `${API_BASE}/api/shop/${tenantId}/products/${productId}/reviews`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerId,
                        rating,
                        title,
                        comment,
                    }),
                }
            );

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
                onSuccess();
            } else {
                setError(data.message || 'Failed to submit review');
            }
        } catch (err) {
            setError('Failed to submit review');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <span className="text-5xl mb-4 block">🎉</span>
                <h3 className="text-xl font-bold text-green-700 mb-2">Thank you for your review!</h3>
                <p className="text-green-600">Your feedback helps other customers.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>✍️</span> Write a Review
            </h3>

            {/* Star Rating */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Rating
                </label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="text-4xl transition-transform hover:scale-110"
                        >
                            <span
                                className={
                                    star <= (hoverRating || rating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                }
                            >
                                ★
                            </span>
                        </button>
                    ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    {rating === 0
                        ? 'Click to rate'
                        : rating === 5
                            ? 'Excellent!'
                            : rating === 4
                                ? 'Great!'
                                : rating === 3
                                    ? 'Good'
                                    : rating === 2
                                        ? 'Fair'
                                        : 'Poor'}
                </p>
            </div>

            {/* Title */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Title (optional)
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* Comment */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review (optional)
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell others about your experience..."
                    rows={4}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
            </div>

            {/* Error */}
            {error && (
                <p className="text-red-500 text-sm mb-4 flex items-center gap-1">
                    <span>❌</span> {error}
                </p>
            )}

            {/* Submit */}
            <button
                onClick={submitReview}
                disabled={loading || rating === 0}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
                {loading ? 'Submitting...' : 'Submit Review'}
            </button>
        </div>
    );
}
