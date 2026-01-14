'use client';

import { Product, addToCart } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useParams } from 'next/navigation';

interface ProductGridProps {
    products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    const params = useParams();
    const tenantId = params.tenantId as string;

    // Get or create session ID
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

    const handleAddToCart = async (productId: number) => {
        const sessionId = getSessionId();
        try {
            await addToCart(tenantId, sessionId, productId, 1);
            alert('Added to cart!');
        } catch (error) {
            console.error('Failed to add to cart:', error);
            alert('Failed to add to cart');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: Product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                />
            ))}
        </div>
    );
}
