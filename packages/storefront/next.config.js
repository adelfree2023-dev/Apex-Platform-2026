/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverActions: {
            allowedOrigins: ['*'],
        },
        typedRoutes: false,
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*',
            },
            {
                source: '/:tenantSubdomain',
                destination: '/shop/:tenantSubdomain',
            },
            {
                source: '/:tenantSubdomain/:path*',
                destination: '/shop/:tenantSubdomain/:path*',
            }
        ];
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    }
                ],
            },
        ];
    },
    images: {
        domains: ['localhost', 'apex-platform.localhost', 'images.unsplash.com', 'cdn.apex-platform.com'],
        minimumCacheTTL: 3600,
    },
};

module.exports = nextConfig;
