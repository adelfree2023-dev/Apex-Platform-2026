import { Product } from '@/types/product.types';
import Link from 'next/link';
import { useCart } from '../cart/cart-provider';

interface ProductCardProps {
    product: Product;
    tenantSubdomain: string;
}

export function ProductCard({ product, tenantSubdomain }: ProductCardProps) {
    const { addToCart } = useCart();

    // Default image if product has no images
    const imageUrl = product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60';

    return (
        <div className="bg-card border rounded-lg overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
            <Link href={`/${tenantSubdomain}/products/${product.id}`} className="aspect-square relative overflow-hidden bg-gray-100 block">
                <img
                    src={imageUrl}
                    alt={product.name}
                    className="object-cover w-full h-full transition-transform hover:scale-105"
                />
                {product.salePrice && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        تخفيض
                    </span>
                )}
            </Link>

            <div className="p-4 flex-1 flex flex-col">
                <Link href={`/${tenantSubdomain}/products/${product.id}`} className="block">
                    <h3 className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors">{product.name}</h3>
                </Link>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>

                <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                        {product.salePrice ? (
                            <>
                                <span className="text-lg font-bold text-red-600">
                                    {product.salePrice} {product.currency}
                                </span>
                                <span className="text-sm text-muted-foreground line-through">
                                    {product.price} {product.currency}
                                </span>
                            </>
                        ) : (
                            <span className="text-lg font-bold">
                                {product.price} {product.currency}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => addToCart(product)}
                        className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                        aria-label="Add to cart"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
