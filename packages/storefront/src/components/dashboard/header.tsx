'use client';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
    return (
        <header className="h-16 border-b bg-card flex items-center px-4 justify-between lg:justify-end">
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                    {/* Bell icon placeholder */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </button>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    A
                </div>
            </div>
        </header>
    );
}
