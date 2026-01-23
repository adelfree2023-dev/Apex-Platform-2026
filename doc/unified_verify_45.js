const BASE_URL = 'http://localhost:3002/api';
const TENANT_ID = 'ae9f6640-5e60-4b2a-9e6b-a2d895498244'; // Standard Test Tenant

const modules = [
    // Phase 1-5 (Business Logic) - 35 Modules
    'shop/:tenantId/vendors', 'shop/:tenantId/payments', 'shop/:tenantId/notification',
    'shop/:tenantId/analytics', 'shop/:tenantId/search', 'shop/:tenantId/promotions',
    'shop/:tenantId/shipping', 'shop/:tenantId/bundles', 'shop/:tenantId/wishlists',
    'shop/:tenantId/seo', 'shop/:tenantId/csv', 'shop/:tenantId/rfq',
    'shop/:tenantId/subscriptions', 'shop/:tenantId/loyalty', 'shop/:tenantId/bookings',
    'shop/:tenantId/ai', 'shop/:tenantId/affiliates', 'shop/:tenantId/marketplace',
    'shop/:tenantId/reports', 'shop/:tenantId/b2b-portal', 'shop/:tenantId/crm',
    'shop/:tenantId/workflow', 'shop/:tenantId/tax', 'shop/:tenantId/multi-warehouse',
    'shop/:tenantId/marketing', 'shop/:tenantId/gift-cards', 'shop/:tenantId/affiliate-net',
    'shop/:tenantId/social-commerce', 'shop/:tenantId/cdp', 'shop/:tenantId/dynamic-pricing',
    'shop/:tenantId/gdpr-center', 'shop/:tenantId/live-chat', 'shop/:tenantId/order-automation',
    'shop/:tenantId/unified-inbox', 'shop/:tenantId/reviews',

    // Phase 8 & 9 (Infrastructure & System) - 10 Modules
    'shop/:tenantId/licenses', 'shop/:tenantId/i18n', 'shop/:tenantId/audit',
    'admin/tenants', 'admin/events', 'admin/super-admin', 'auth',
    'app', 'infra/middleware', 'infra/prisma'
];

async function verifyAll() {
    console.log('🚀 Starting Full 45-Module Verification (Port 3002)...');
    let successCount = 0;

    // Simulate a valid tenant request
    // Assumes test tenant ae9f6640... has subdomain 'fashion-store' or similar
    // We use a known valid subdomain from previous context or a wildcard
    const headers = {
        'Host': 'store-ae9f6640.apex-platform.com' // Simulating valid subdomain
    };

    for (const mod of modules) {
        let path = mod.replace(':tenantId', TENANT_ID);

        const url = `${BASE_URL}/${path}/health`;

        try {
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            console.log(`✅ [PASS] ${url} -> ${JSON.stringify(data)}`);
            successCount++;
        } catch (err) {
            console.error(`❌ [FAIL] ${url} -> ${err.message}`);
        }
    }

    console.log(`\n📊 Final Result: ${successCount}/${modules.length} Modules Operational`);
    if (successCount === modules.length) {
        console.log('🏆 100% Engineering Stabilization ACHIEVED!');
    } else {
        console.log('⚠️ Some modules need attention.');
    }
}

verifyAll();
