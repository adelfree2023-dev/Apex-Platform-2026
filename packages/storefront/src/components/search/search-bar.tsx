'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

interface SearchBarProps {
    defaultValue?: string;
    placeholder?: string;
}

export function SearchBar({ defaultValue = '', placeholder = 'Search...' }: SearchBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [text, setText] = useState(defaultValue);
    const [query] = useDebounce(text, 500);

    useEffect(() => {
        if (query === defaultValue && !text) return;

        const params = new URLSearchParams(searchParams);
        if (query) {
            params.set('q', query);
        } else {
            params.delete('q');
        }
        params.set('page', '1'); // Reset to first page on search

        router.push(`?${params.toString()}`);
    }, [query, router, searchParams, defaultValue]);

    return (
        <div className="relative w-full max-w-xl mx-auto">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        </div>
    );
}
