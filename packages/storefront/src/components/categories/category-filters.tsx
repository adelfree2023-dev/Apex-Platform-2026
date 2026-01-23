'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function CategoryFilters({ tenantSubdomain }: { tenantSubdomain: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category');

    // This would ideally come from an API
    const categories = [
        { id: 'electronics', name: 'إلكترونيات' },
        { id: 'clothing', name: 'ملابس' },
        { id: 'home', name: 'منزل' },
        { id: 'beauty', name: 'جمال' },
    ];

    const handleCategoryClick = (categoryId: string) => {
        const params = new URLSearchParams(searchParams);
        if (currentCategory === categoryId) {
            params.delete('category');
        } else {
            params.set('category', categoryId);
            params.set('page', '1');
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">الفئات</h3>
            <div className="flex flex-col space-y-2">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className={`text-right px-3 py-2 rounded-md transition-colors ${currentCategory === category.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
