const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 80,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        let parsed = {};
                        if (body.trim() !== '') {
                            parsed = JSON.parse(body);
                        }
                        parsed.status = res.statusCode;
                        resolve(parsed);
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: body });
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error(`Network Error to ${url}: ${e.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request Timeout for ${url}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function createTenantWithRetry(name, subdomain, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await request(`${BASE_URL}/api/admin/tenants`, 'POST', {
                name,
                subdomain: `${subdomain}-${Date.now()}`,
                businessType: 'Retail',
                territory: 'Egypt'
            });
            if (res.id) return res.id;
            if (res.status === 429) {
                console.log(`⚠️ Rate limited (429). Retrying in 2s...`);
                await sleep(2000);
                continue;
            }
            console.error(`❌ Failed to create tenant: Status ${res.status} - ${JSON.stringify(res)}`);
        } catch (e) {
            console.error(`❌ Request Error [Attempt ${i + 1}]: ${e.message}`);
            await sleep(1000);
        }
    }
    return null;
}

async function runIsolationTest() {
    console.log(`🛡️ Starting Detailed Isolation & Module Test on ${BASE_URL}...`);

    // 1. Create two distinct tenants
    console.log('👥 Creating Alpha and Beta stores...');
    const id1 = await createTenantWithRetry('Alpha Corp', 'alpha');
    await sleep(500);
    const id2 = await createTenantWithRetry('Beta Ltd', 'beta');

    if (!id1 || !id2) {
        console.error('❌ Failed to create tenants. Is the server running? Check BASE_URL.');
        process.exit(1);
    }

    console.log(`✅ Tenants created: Alpha (${id1}), Beta (${id2})`);

    // 2. Perform Migration for new modules
    console.log('🏗️ Performing Migrations for Advanced Modules...');
    const migrationEndpoints = [
        `/api/shop/${id1}/migrate-customers`,
        `/api/shop/${id1}/live-chat/migrate`,
        `/api/shop/${id1}/order-automation/migrate`,
        `/api/shop/${id1}/marketing/migrate`,
        `/api/shop/${id1}/gift-cards/migrate`,
        `/api/shop/${id1}/wholesale/migrate`,
        `/api/shop/${id1}/notifications/migrate`,
        `/api/shop/${id1}/reviews/migrate`,
        `/api/shop/${id1}/auth/migrate`
    ];

    for (const endpoint of migrationEndpoints) {
        process.stdout.write(`Migrating ${endpoint}... `);
        const res = await request(`${BASE_URL}${endpoint}`, 'POST');
        if (res.status === 201 || res.status === 200) {
            console.log('✅');
        } else {
            console.log(`❌ (Status ${res.status})`);
        }
        await sleep(200);
    }

    const modules = [
        ['01-SuperAdmin', '/api/admin/stats', 'GET'],
        ['02-Auth', `/api/shop/${id1}/auth/profile`, 'GET'],
        ['03-Tenant Mng', '/api/admin/tenants', 'GET'],
        ['04-Dashboard', '/api/admin/stats', 'GET'],
        ['05-Orders', `/api/shop/${id1}/orders`, 'GET'],
        ['06-Products', `/api/shop/${id1}/products`, 'GET'],
        ['07-Customers', `/api/shop/${id1}/customers`, 'GET'],
        ['08-Catalog', `/api/shop/${id1}/products`, 'GET'],
        ['09-Loyalty', `/api/shop/${id1}/loyalty/rewards`, 'GET'],
        ['10-AI Nucleus', `/api/shop/ai/trending`, 'GET'],
        ['11-Affiliate Sys', `/api/shop/${id1}/affiliates`, 'GET'],
        ['12-Bookings', `/api/shop/${id1}/bookings/services`, 'GET'],
        ['13-Marketplace', `/api/shop/${id1}/vendors`, 'GET'],
        ['14-Notification', `/api/shop/${id1}/notifications/health`, 'GET'],
        ['15-Analytics', `/api/shop/${id1}/analytics/overview`, 'GET'],
        ['16-Search', `/api/shop/${id1}/search/facets`, 'GET'],
        ['17-Shipping', `/api/shop/${id1}/shipping/zones`, 'GET'],
        ['18-Wishlists', `/api/shop/${id1}/customers/1/wishlist`, 'GET'],
        ['19-SEO', `/api/shop/${id1}/seo/meta?page=home`, 'GET'],
        ['20-Reviews', `/api/shop/${id1}/reviews/health`, 'GET'],
        ['21-Social Integration', `/api/shop/${id1}/social/tiktok/account`, 'GET'],
        ['22-Wholesale', `/api/shop/${id1}/wholesale/health`, 'GET'],
        ['23-Workflow', `/api/shop/${id1}/workflow`, 'GET'],
        ['24-Tax Service', `/api/shop/${id1}/tax/calculate`, 'POST', { country: 'EG', amount: 100 }],
        ['25-Multi-WH', `/api/shop/${id1}/warehouse`, 'GET'],
        ['26-Marketing', `/api/shop/${id1}/marketing/health`, 'GET'],
        ['27-GiftCards', `/api/shop/${id1}/gift-cards/health`, 'GET'],
        ['28-CDP', `/api/shop/${id1}/cdp/health`, 'GET'],
        ['29-Dyn Pricing', `/api/shop/${id1}/pricing/dynamic/health`, 'GET'],
        ['30-GDPR Center', `/api/shop/${id1}/gdpr/health`, 'GET'],
        ['31-Adv Analytics', `/api/shop/${id1}/analytics/overview`, 'GET'],
        ['32-Audit Logs', `/api/admin/audit/stats`, 'GET'],
        ['33-Events', `/api/admin/events/stats`, 'GET'],
        ['34-i18n/SMS', `/api/shop/${id1}/i18n/translations`, 'GET'],
        ['35-CSV Import', `/api/shop/${id1}/csv/template/products`, 'GET'],
        ['36-Bundles', `/api/shop/${id1}/bundles`, 'GET'],
        ['37-Pay Gateway', `/api/shop/${id1}/payments/methods`, 'GET'],
        ['38-Promotions', `/api/shop/${id1}/coupons`, 'GET'],
        ['39-HQ Auth', `/api/admin/stats`, 'GET'],
        ['40-Affiliate Net', `/api/shop/${id1}/affiliate-net/health`, 'GET'],
        ['41-Social Comm', `/api/shop/${id1}/social/tiktok/sync/1`, 'POST'],
        ['42-Live Chat', `/api/shop/${id1}/live-chat/health`, 'GET'],
        ['43-Order Auto', `/api/shop/${id1}/order-automation/health`, 'GET'],
        ['44-Unified Inbox', `/api/shop/${id1}/webhooks/health`, 'GET'],
        ['45-Middleware', '/health', 'GET']
    ];

    let passed = 0;
    for (const [name, path, method, body] of modules) {
        process.stdout.write(`${name.padEnd(20)}: `);
        try {
            const res = await request(`${BASE_URL}${path}`, method, body);
            if (res.status !== 404 && res.status !== undefined) {
                process.stdout.write('\x1b[32mONLINE ✅\x1b[0m');
                if (res.status !== 200 && res.status !== 201) process.stdout.write(` (Status ${res.status})`);
                console.log('');
                passed++;
            } else {
                console.log('\x1b[31mOFFLINE ❌\x1b[0m');
            }
        } catch (e) {
            console.log(`\x1b[31mOFFLINE ❌ (Err: ${e.message})\x1b[0m`);
        }
        await sleep(100);
    }

    console.log(`\n📊 Final Summary: ${passed}/${modules.length} Modules Online.`);

    // 3. Simple Isolation Test
    console.log('\n🧪 Testing Tenant Isolation...');
    try {
        await request(`${BASE_URL}/api/shop/${id1}/products`, 'POST', { name: 'Alpha Secret Product', price: 999, slug: `secret-${Date.now()}` });
        const betaProducts = await request(`${BASE_URL}/api/shop/${id2}/products`, 'GET');
        const leakage = Array.isArray(betaProducts.data) && betaProducts.data.some(p => p.name === 'Alpha Secret Product');

        if (leakage) {
            console.error('❌ FAILURE: Data leakage detected between Alpha and Beta!');
        } else {
            console.log('✅ SUCCESS: Tenant isolation verified.');
        }
    } catch (e) {
        console.error(`❌ Isolation Test Failed due to request error: ${e.message}`);
    }
}

runIsolationTest().catch(console.error);
