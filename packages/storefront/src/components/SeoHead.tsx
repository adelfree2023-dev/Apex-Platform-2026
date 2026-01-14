'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://34.102.65.89:3001';

interface MetaData {
    title: string;
    description: string;
    keywords?: string;
    ogImage?: string;
    ogType?: string;
    canonical?: string;
}

interface SeoHeadProps {
    tenantId: string;
    pageType: 'home' | 'products' | 'product' | 'cart' | 'checkout' | 'category';
    pageId?: number;
    fallback?: MetaData;
    storeName?: string;
}

export default function SeoHead({
    tenantId,
    pageType,
    pageId,
    fallback,
    storeName = 'Apex Store'
}: SeoHeadProps) {
    const [meta, setMeta] = useState<MetaData>(fallback || {
        title: storeName,
        description: 'Discover amazing products',
    });

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const endpoint = pageType === 'product' && pageId
                    ? `${API_BASE}/api/shop/${tenantId}/products/${pageId}/seo`
                    : `${API_BASE}/api/shop/${tenantId}/seo/meta?page=${pageType}${pageId ? `&id=${pageId}` : ''}`;

                const res = await fetch(endpoint);
                const data = await res.json();
                if (data.success && data.data?.title) {
                    setMeta(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch SEO meta:', error);
            }
        };

        fetchMeta();
    }, [tenantId, pageType, pageId]);

    const fullTitle = meta.title.includes(storeName)
        ? meta.title
        : `${meta.title} | ${storeName}`;

    return (
        <Head>
            <title>{fullTitle}</title>
            <meta name="description" content={meta.description} />

            {meta.keywords && (
                <meta name="keywords" content={meta.keywords} />
            )}

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={meta.description} />
            <meta property="og:type" content={meta.ogType || 'website'} />
            {meta.ogImage && <meta property="og:image" content={meta.ogImage} />}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={meta.description} />
            {meta.ogImage && <meta name="twitter:image" content={meta.ogImage} />}

            {/* Canonical */}
            {meta.canonical && <link rel="canonical" href={meta.canonical} />}
        </Head>
    );
}
