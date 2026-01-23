'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/types/product.types';
import { toast } from 'sonner';
import { useTenant } from '@/providers/tenant-provider';

interface CartItem extends Product {
    quantity: number;
    tenantId?: string;
}

interface CartContextType {
    items: CartItem[];
    totalItems: number;
    totalPrice: number;
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    checkout: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    addToCart: () => { },
    removeFromCart: () => { },
    updateQuantity: () => { },
    clearCart: () => { },
    checkout: async () => { },
});

export function CartProvider({ children }: { children: ReactNode }) {
    const { tenant } = useTenant();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // تحميل سلة التسوق من localStorage عند التحميل
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedCart = localStorage.getItem('apex_cart');
            if (storedCart) {
                try {
                    const parsedCart = JSON.parse(storedCart);
                    // التحقق من أن العناصر تنتمي للمستأجر الحالي
                    const filteredCart = parsedCart.filter(
                        (item: CartItem) => item.tenantId === tenant?.id
                    );
                    setCartItems(filteredCart);
                } catch (error) {
                    console.error('Failed to parse cart from localStorage:', error);
                    localStorage.removeItem('apex_cart');
                }
            }
        }
    }, [tenant?.id]);

    // حفظ سلة التسوق في localStorage عند التغيير
    useEffect(() => {
        if (typeof window !== 'undefined' && tenant?.id) {
            const cartToSave = cartItems.map(item => ({
                ...item,
                tenantId: tenant.id
            }));
            localStorage.setItem('apex_cart', JSON.stringify(cartToSave));
        }
    }, [cartItems, tenant?.id]);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce(
        (sum, item) => sum + (item.salePrice || item.price) * item.quantity,
        0
    );

    const addToCart = (product: Product, quantity: number = 1) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id);

            if (existingItem) {
                return prevItems.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            return [
                ...prevItems,
                {
                    ...product,
                    quantity,
                    tenantId: tenant?.id || ''
                }
            ];
        });

        toast.success(`${product.name} أُضيف إلى السلة`, {
            description: `الكمية: ${quantity}`,
            action: {
                label: 'عرض السلة',
                onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        });
    };

    const removeFromCart = (productId: string) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));

        const removedItem = cartItems.find(item => item.id === productId);
        if (removedItem) {
            toast.info(`${removedItem.name} أُزيل من السلة`);
        }
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === productId
                    ? { ...item, quantity: Math.min(quantity, item.stock) }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
        toast.info('تم تفريغ السلة');
    };

    const checkout = async () => {
        if (cartItems.length === 0) {
            toast.error('السلة فارغة');
            return;
        }

        if (!tenant?.id) {
            toast.error('لم يتم تحميل بيانات المتجر');
            return;
        }

        try {
            // هنا يمكننا إرسال عملية الشراء إلى الـ API
            const response = await fetch(`/api/shop/${tenant.subdomain}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenant.id,
                },
                body: JSON.stringify({
                    items: cartItems.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.salePrice || item.price
                    }))
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'فشل عملية الدفع');
            }

            const order = await response.json();

            // تفريغ السلة بعد عملية الشراء الناجحة
            clearCart();

            toast.success('تم إتمام الطلب بنجاح', {
                description: `رقم الطلب: ${order.orderNumber}`,
                action: {
                    label: 'عرض الطلب',
                    onClick: () => window.location.href = `/${tenant.subdomain}/orders/${order.id}`
                }
            });

            return order;
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('فشل عملية الشراء', {
                description: error instanceof Error ? error.message : 'حدث خطأ أثناء عملية الدفع'
            });
            throw error;
        }
    };

    return (
        <CartContext.Provider
            value={{
                items: cartItems,
                totalItems,
                totalPrice,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                checkout,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);

export default CartProvider;
