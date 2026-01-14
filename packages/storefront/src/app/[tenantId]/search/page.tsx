'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';

interface Product {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock_on_hand: number;
    category_name: string;
}

interface SearchResult {
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
}

interface Facets {
    categories: { id: number; name: string; slug: string; product_count: number }[];
    priceRange: { min: number; max: number };
    stockStatus: { inStock: number; outOfStock: number };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

export default function SearchPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tenantId = params.tenantId as string;

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [facets, setFacets] = useState<Facets | null>(null);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

    const fetchFacets = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/search/facets`);
            const data = await res.json();
            if (data.success) {
                setFacets(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch facets:', error);
        }
    }, [tenantId]);

    const performSearch = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (query) queryParams.set('q', query);
            if (selectedCategory) queryParams.set('category', selectedCategory);
            if (minPrice) queryParams.set('minPrice', minPrice);
            if (maxPrice) queryParams.set('maxPrice', maxPrice);
            if (inStock) queryParams.set('inStock', 'true');
            queryParams.set('sortBy', sortBy);
            queryParams.set('page', page.toString());
            queryParams.set('limit', '12');

            const res = await fetch(`${API_BASE}/api/shop/${tenantId}/search?${queryParams}`);
            const data = await res.json();

            if (data.success) {
                setResults({
                    products: data.products,
                    total: data.total,
                    page: data.page,
                    totalPages: data.totalPages,
                });
            }

            // Update URL
            router.push(`/${tenantId}/search?${queryParams}`, { scroll: false });
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, query, selectedCategory, minPrice, maxPrice, inStock, sortBy, page, router]);

    useEffect(() => {
        fetchFacets();
    }, [fetchFacets]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            performSearch();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query, selectedCategory, minPrice, maxPrice, inStock, sortBy, page]);

    const addToCart = async (productId: number) => {
        const sessionId = localStorage.getItem('apex_session_id') || `session_${Date.now()}`;
        localStorage.setItem('apex_session_id', sessionId);

        await fetch(`${API_BASE}/api/shop/${tenantId}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                productVariantId: productId,
                quantity: 1,
            }),
        });
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <span>🔍</span> Advanced Search
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>

                            {/* Search Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                                    placeholder="Search products..."
                                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Categories */}
                            {facets?.categories && facets.categories.length > 0 && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                                        className="w-full p-3 border rounded-xl"
                                    >
                                        <option value="">All Categories</option>
                                        {facets.categories.map((cat) => (
                                            <option key={cat.id} value={cat.slug}>
                                                {cat.name} ({cat.product_count})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Price Range */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (EGP)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={minPrice}
                                        onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                                        placeholder="Min"
                                        className="w-1/2 p-2 border rounded-lg text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={maxPrice}
                                        onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                                        placeholder="Max"
                                        className="w-1/2 p-2 border rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            {/* In Stock */}
                            <div className="mb-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inStock}
                                        onChange={(e) => { setInStock(e.target.checked); setPage(1); }}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">In Stock Only</span>
                                    {facets?.stockStatus && (
                                        <span className="text-xs text-gray-400">
                                            ({facets.stockStatus.inStock})
                                        </span>
                                    )}
                                </label>
                            </div>

                            {/* Sort By */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                                    className="w-full p-3 border rounded-xl"
                                >
                                    <option value="name">Name (A-Z)</option>
                                    <option value="price_asc">Price (Low to High)</option>
                                    <option value="price_desc">Price (High to Low)</option>
                                    <option value="newest">Newest First</option>
                                    <option value="popular">Most Popular</option>
                                </select>
                            </div>

                            {/* Clear Filters */}
                            <button
                                onClick={() => {
                                    setQuery('');
                                    setSelectedCategory('');
                                    setMinPrice('');
                                    setMaxPrice('');
                                    setInStock(false);
                                    setSortBy('name');
                                    setPage(1);
                                }}
                                className="w-full bg-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-300"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-3">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-gray-600">
                                {results ? `${results.total} products found` : 'Searching...'}
                            </p>
                        </div>

                        {/* Loading */}
                        {loading && (
                            <div className="flex items-center justify-center py-20">
                                <span className="text-4xl animate-spin">🔍</span>
                            </div>
                        )}

                        {/* Products Grid */}
                        {!loading && results && (
                            <>
                                {results.products.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                                        <span className="text-6xl mb-4 block">😕</span>
                                        <h2 className="text-xl font-bold text-gray-700 mb-2">No products found</h2>
                                        <p className="text-gray-500">Try adjusting your filters or search term</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {results.products.map((product) => (
                                            <div
                                                key={product.id}
                                                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                                            >
                                                <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                                    <span className="text-6xl">📦</span>
                                                </div>
                                                <div className="p-4">
                                                    {product.category_name && (
                                                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                                                            {product.category_name}
                                                        </span>
                                                    )}
                                                    <h3 className="text-lg font-bold text-gray-900 mt-2">{product.name}</h3>
                                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                                        {product.description}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-4">
                                                        <span className="text-xl font-bold text-green-600">
                                                            EGP {(product.price / 100).toFixed(2)}
                                                        </span>
                                                        <span className={`text-xs ${product.stock_on_hand > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {product.stock_on_hand > 0 ? `${product.stock_on_hand} in stock` : 'Out of stock'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => addToCart(product.id)}
                                                        disabled={product.stock_on_hand <= 0}
                                                        className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                {results.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-8">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-4 py-2">
                                            Page {page} of {results.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(Math.min(results.totalPages, page + 1))}
                                            disabled={page === results.totalPages}
                                            className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
