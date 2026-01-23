'use client';

import Link from 'next/link';

export function Sidebar({ section, onClose }: { section: string; onClose?: () => void }) {
    const navItems = [
        { label: 'نظرة عامة', href: 'overview', icon: 'ChartPie' },
        { label: 'الطلبات', href: 'orders', icon: 'ShoppingBag' },
        { label: 'المنتجات', href: 'products', icon: 'Tag' },
        { label: 'العملاء', href: 'customers', icon: 'Users' },
        { label: 'التقارير', href: 'reports', icon: 'ChartBar' },
        { label: 'الإعدادات', href: 'settings', icon: 'Cog' },
    ];

    return (
        <div className="h-full w-64 bg-card border-l flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
                <span className="font-bold text-lg">لوحة التحكم</span>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden text-gray-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={`dashboard?section=${item.href}` as any}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${section === item.href
                            ? 'bg-primary text-primary-foreground'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {/* Icon placeholder */}
                        <span className="w-5 h-5 bg-current opacity-20 rounded-full" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
