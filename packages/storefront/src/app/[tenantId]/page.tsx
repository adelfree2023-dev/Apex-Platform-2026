import { getProducts } from '@/lib/api';
import ProductGrid from '@/components/ProductGrid';
import Header from '@/components/Header';

export default async function TenantHomePage({
    params,
}: {
    params: Promise<{ tenantId: string }>;
}) {
    const { tenantId } = await params;

    let products = [];
    try {
        const response = await getProducts(tenantId);
        products = response.data || [];
    } catch (error) {
        console.error('Failed to fetch products:', error);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Welcome to <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Apex Store</span>
                    </h1>
                    <p className="text-xl text-gray-600">
                        Discover quality products from our trusted merchants
                    </p>
                </div>

                {/* Products Grid */}
                {products.length > 0 ? (
                    <ProductGrid products={products} />
                ) : (
                    <div className="text-center py-16">
                        <span className="text-6xl mb-4 block">📦</span>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">No products yet</h2>
                        <p className="text-gray-500">Products will appear here when added.</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-16 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
                    <p>© 2026 Apex Platform. Powered by Cooperative Intelligence.</p>
                </div>
            </footer>
        </div>
    );
}

