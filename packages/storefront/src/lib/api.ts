/**
 * API Client for Apex Platform Backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    sku: string;
    cooperative_eligible: boolean;
    quality_score: number;
}

export interface CartItem {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
}

export interface Cart {
    id: number;
    session_id: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    itemCount: number;
}

export interface Order {
    id: number;
    code: string;
    state: string;
    total: number;
}

// Products
export async function getProducts(tenantId: string): Promise<{ success: boolean; data: Product[] }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/products`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
}

// Cart
export async function getCart(tenantId: string, sessionId: string): Promise<{ success: boolean; data: Cart }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/cart`, {
        headers: { 'x-session-id': sessionId },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
}

export async function addToCart(
    tenantId: string,
    sessionId: string,
    productId: number,
    quantity: number
): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/cart`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
        },
        body: JSON.stringify({ productId, quantity }),
    });
    if (!res.ok) throw new Error('Failed to add to cart');
    return res.json();
}

export async function removeFromCart(tenantId: string, itemId: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/cart/${itemId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove from cart');
    return res.json();
}

// Checkout
export async function checkout(
    tenantId: string,
    sessionId: string,
    customerEmail: string
): Promise<{ success: boolean; data: Order }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
        },
        body: JSON.stringify({ customerEmail }),
    });
    if (!res.ok) throw new Error('Failed to checkout');
    return res.json();
}

// Payment Methods
export async function getPaymentMethods(tenantId: string): Promise<{ success: boolean; methods: string[] }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/payments/methods`);
    if (!res.ok) throw new Error('Failed to fetch payment methods');
    return res.json();
}

// Process Payment
export async function processPayment(
    tenantId: string,
    orderId: number,
    method: string
): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, method }),
    });
    if (!res.ok) throw new Error('Failed to process payment');
    return res.json();
}

// ==================== CATEGORIES (Phase 05) ====================

export interface Category {
    id: number;
    name: string;
    slug: string;
    description: string;
    product_count: number;
}

// Get all categories
export async function getCategories(tenantId: string): Promise<{ success: boolean; data: Category[] }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/categories`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
}

// Get products by category
export async function getProductsByCategory(tenantId: string, categorySlug: string): Promise<{ success: boolean; data: Product[] }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/categories/${categorySlug}/products`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch products by category');
    return res.json();
}

// ==================== SEARCH (Phase 05) ====================

// Search products
export async function searchProducts(tenantId: string, query: string): Promise<{ success: boolean; data: Product[] }> {
    const res = await fetch(`${API_BASE}/api/shop/${tenantId}/products/search?q=${encodeURIComponent(query)}`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to search products');
    return res.json();
}

