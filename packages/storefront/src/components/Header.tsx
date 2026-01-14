'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

interface HeaderProps {
    cartItemCount?: number;
}

export default function Header({ cartItemCount = 0 }: HeaderProps) {
    const params = useParams();
    const tenantId = params.tenantId as string;

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href={`/${tenantId}`} className="flex items-center space-x-2">
                    <span className="text-3xl">🏪</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Apex Store
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center space-x-6">
                    <Link
                        href={`/${tenantId}`}
                        className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
                    >
                        Products
                    </Link>
                    <Link
                        href={`/${tenantId}/cart`}
                        className="relative flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        <span>🛒</span>
                        <span>Cart</span>
                        {cartItemCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        )}
                    </Link>
                </nav>
            </div>
        </header>
    );
}
