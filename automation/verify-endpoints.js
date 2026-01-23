
const fs = require('fs');
const path = require('path');

/**
 * Build-Time Architectural Guard (APEX_PROTOCOL_V2)
 * Ensures all Phase 1-5 modules adhere to the standardized prefix and mandatory endpoints.
 */

const CORE_PATH = path.join(__dirname, '../packages/core/src');
const MANDATORY_MODULES = [
    // Phases 1-5 (25)
    'social-commerce', 'billing', 'crm', 'subscriptions', 'seo',
    'ai', 'gdpr-center', 'unified-inbox', 'marketing', 'reviews',
    'analytics', 'reports', 'audit', 'csv', 'cdp',
    'shipping', 'promotions', 'marketplace', 'bundles', 'bookings',
    'b2b-portal', 'search', 'rfq', 'notifications', 'vendors',
    // Phases 6-7 (10)
    'loyalty', 'affiliate-net', 'affiliates', 'gift-cards', 'wishlists',
    'dynamic-pricing', 'order-automation', 'live-chat', 'multi-warehouse', 'workflow'
];

function verifyControllers() {
    console.log('🔍 Starting Build-Time Architectural Verification (ZERO-DRIFT: 35 Modules)...');
    let errors = 0;

    MANDATORY_MODULES.forEach(mod => {
        // Dynamic file lookup based on naming convention
        const singularMod = mod.replace(/s$/, '').replace('-portal', '').replace('-center', '');
        const pluralMod = mod.endsWith('s') ? mod : `${mod}s`;

        const possibleFiles = [
            path.join(CORE_PATH, mod, `${mod}.controller.ts`),
            path.join(CORE_PATH, mod, `${singularMod}.controller.ts`),
            path.join(CORE_PATH, mod.replace(/s$/, ''), `${mod}.controller.ts`),
            path.join(CORE_PATH, mod, `subscription.controller.ts`),
            path.join(CORE_PATH, mod, `social-webhooks.controller.ts`),
            path.join(CORE_PATH, mod, `vendure.controller.ts`),
            path.join(CORE_PATH, mod, `notification.controller.ts`),
            path.join(CORE_PATH, mod, `wishlist.controller.ts`),
            path.join(CORE_PATH, mod, `affiliate.controller.ts`)
        ];

        let specificPath = null;
        for (const f of possibleFiles) {
            if (fs.existsSync(f)) {
                specificPath = f;
                break;
            }
        }

        if (!specificPath) {
            console.error(`❌ Missing controller for module: ${mod}`);
            errors++;
            return;
        }

        const content = fs.readFileSync(specificPath, 'utf8');

        // 1. Check Standard Prefix: @Controller('api/shop/:tenantId/{module}')
        // This ensures pluralization consistency (e.g. 'wishlists' vs 'wishlist')
        const prefixRegex = new RegExp(`@Controller\\(['"]api/shop/:tenantId/${mod}['"]\\)`);

        if (!prefixRegex.test(content)) {
            console.error(`❌ Module ${mod} HAS NON-STANDARD PREFIX. Expected api/shop/:tenantId/${mod}`);
            errors++;
        }

        // 2. Check for Mandatory Migrate Endpoint
        if (!content.includes("@Post('migrate')")) {
            console.error(`❌ Module ${mod} missing mandatory @Post('migrate') endpoint`);
            errors++;
        }

        // 3. Check for Mandatory Health Endpoint
        if (!content.includes("@Get('health')")) {
            console.error(`❌ Module ${mod} missing mandatory @Get('health') endpoint`);
            errors++;
        }

        // 4. Check for TenantScopedGuard
        if (!content.includes('TenantScopedGuard')) {
            console.error(`❌ Module ${mod} missing mandatory TenantScopedGuard`);
            errors++;
        }
    });

    if (errors > 0) {
        console.error(`\n🚨 ZERO-DRIFT VIOLATION: ${errors} architectural errors found.`);
        console.error(`🚨 Build Rejected. Fix the controllers above to proceed.`);
        process.exit(1);
    } else {
        console.log(`\n✅ Architectural Integrity Verified (35/35 Modules). Protocols enforced.`);
    }
}

verifyControllers();
