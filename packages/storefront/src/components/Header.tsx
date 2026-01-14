'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import SearchBar from './SearchBar';

interface HeaderProps {
    cartItemCount?: number;
    showSearch?: boolean;
}

export default function Header({ cartItemCount = 0, showSearch = true }: HeaderProps) {
    const params = useParams();
    const tenantId = params.tenantId as string;

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link href={`/${tenantId}`} className="flex items-center space-x-2 shrink-0">
                    <span className="text-3xl">🏪</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
                        Apex Store
                    </span>
                </Link>

                {/* Search Bar */}
                {showSearch && (
                    <div className="flex-1 max-w-xl hidden md:block">
                        <SearchBar />
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex items-center space-x-4 shrink-0">
                    <Link
                        href={`/${tenantId}`}
                        className="text-gray-600 hover:text-indigo-600 transition-colors font-medium hidden sm:block"
                    >
                        Products
                    </Link>
                    <Link
                        href={`/${tenantId}/cart`}
                        className="relative flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        <span>🛒</span>
                        <span className="hidden sm:inline">Cart</span>
                        {cartItemCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        )}
                    </Link>
                </nav>
            </div>

            {/* Mobile Search */}
            {showSearch && (
                <div className="md:hidden px-4 pb-4">
                    <SearchBar />
                </div>
            )}
        </header>
    );
}

