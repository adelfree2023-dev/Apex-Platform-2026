'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Category } from '@/lib/api';

interface CategoryNavProps {
    categories: Category[];
    activeSlug?: string;
}

export default function CategoryNav({ categories, activeSlug }: CategoryNavProps) {
    const router = useRouter();
    const params = useParams();
    const tenantId = params.tenantId as string;

    const handleCategoryClick = (slug: string | null) => {
        if (slug) {
            router.push(`/${tenantId}?category=${slug}`);
        } else {
            router.push(`/${tenantId}`);
        }
    };

    return (
        <nav className="mb-8">
            <div className="flex flex-wrap gap-2">
                {/* All Products button */}
                <button
                    onClick={() => handleCategoryClick(null)}
                    className={`px-4 py-2 rounded-full font-medium transition-all ${!activeSlug
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    All Products
                </button>

                {/* Category buttons */}
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.slug)}
                        className={`px-4 py-2 rounded-full font-medium transition-all ${activeSlug === category.slug
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {category.name}
                        {category.product_count > 0 && (
                            <span className="ml-1 text-xs opacity-70">({category.product_count})</span>
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
}
