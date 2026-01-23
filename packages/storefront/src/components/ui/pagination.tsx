'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
    const searchParams = useSearchParams();

    const createPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());
        return `${basePath}?${params.toString()}`;
    };

    if (totalPages <= 1) return null;

    return (
        <nav className="flex items-center space-x-2 space-x-reverse" aria-label="Pagination">
            <Link
                href={createPageUrl(Math.max(1, currentPage - 1))}
                className={`px-3 py-1 rounded border ${currentPage === 1 ? 'pointer-events-none opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                aria-disabled={currentPage === 1}
            >
                السابق
            </Link>

            <span className="text-sm text-gray-600">
                صفحة {currentPage} من {totalPages}
            </span>

            <Link
                href={createPageUrl(Math.min(totalPages, currentPage + 1))}
                className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'pointer-events-none opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                aria-disabled={currentPage === totalPages}
            >
                التالي
            </Link>
        </nav>
    );
}
