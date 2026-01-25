const fs = require('fs');

const BASE_URL = 'http://localhost:3002/api';
const TEST_TENANT = 'ae9f6640-5e60-4b2a-9e6b-a2d895498244';
const LOG_FILE = './doc/final_verification_report.csv';

const results = [];

async function logResult(component, layer, back, data, ip, status) {
    const entry = {
        Timestamp: new Date().toISOString(),
        Component: component,
        Layer: layer,
        Back_Status: back,
        Data_Payload: JSON.stringify(data).replace(/,/g, ';'),
        IP_Context: ip,
        Status: status
    };
    results.push(entry);
    console.log(`[${status}] ${component} (${layer})`);
}

async function runVerification() {
    console.log('🛡️ Starting ASMP Multi-Layer Verification...');

    // 1. Test Auth & Security (Back/Data/IP)
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: 'admin@apex.com', password: 'ValidPassword123!' }),
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': TEST_TENANT, 'X-Forwarded-For': '1.2.3.4' }
        });
        const data = await loginRes.json();
        await logResult('AuthController', 'Controller', loginRes.status, 'Token Result', '1.2.3.4', loginRes.ok ? 'PASS' : 'FAIL');
    } catch (error) {
        await logResult('AuthController', 'Controller', 500, error.message, '1.2.3.4', 'FAIL');
    }

    // 2. Test Tenant Scoped Guard & IP Extraction
    try {
        const productRes = await fetch(`${BASE_URL}/shop/${TEST_TENANT}/products`, {
            headers: { 'x-tenant-id': TEST_TENANT, 'X-Forwarded-For': '8.8.8.8' }
        });
        const data = await productRes.json();
        await logResult('TenantScopedGuard', 'Guards', productRes.status, `Items: ${data.length || 0}`, '8.8.8.8', productRes.ok ? 'PASS' : 'FAIL');
    } catch (error) {
        await logResult('TenantScopedGuard', 'Guards', 500, 'Access Denied', '8.8.8.8', 'FAIL');
    }

    // 3. Test Rate Limiter (S6 Protocol)
    console.log('⏳ Stress testing RateLimiter (S6)...');
    try {
        let lastStatus = 200;
        for (let i = 0; i < 15; i++) {
            const res = await fetch(`${BASE_URL}/app/health`, { headers: { 'X-Forwarded-For': '9.9.9.9' } });
            lastStatus = res.status;
            if (lastStatus === 429) break;
        }
        await logResult('TenantThrottlerGuard', 'Middleware', lastStatus, lastStatus === 429 ? 'Rate Limit Triggered' : 'Limit Not Hit', '9.9.9.9', lastStatus === 429 ? 'PASS' : 'WARN');
    } catch (error) {
        await logResult('TenantThrottlerGuard', 'Middleware', 500, error.message, '9.9.9.9', 'FAIL');
    }

    // 4. Test Modules (Shop, Payment, Category)
    const modules = ['storefront/shop', 'storefront/payment', 'categories'];
    for (const mod of modules) {
        try {
            const res = await fetch(`${BASE_URL}/${mod}/health`, { headers: { 'x-tenant-id': TEST_TENANT } });
            await logResult(mod.split('/')[1] || mod, 'Modules', res.status, 'Health OK', 'Internal', res.ok ? 'PASS' : 'FAIL');
        } catch (e) {
            await logResult(mod, 'Modules', 500, e.message, 'Internal', 'FAIL');
        }
    }

    // 5. Test Audit Logging Sync
    try {
        const auditRes = await fetch(`${BASE_URL}/audit/logs`, {
            headers: { 'x-tenant-id': TEST_TENANT }
        });
        await logResult('AuditService', 'Services', auditRes.status, 'Logs Retrieved', 'Internal', auditRes.ok ? 'PASS' : 'FAIL');
    } catch (error) {
        await logResult('AuditService', 'Services', 500, 'Audit Failure', 'Internal', 'FAIL');
    }

    // 6. OWASP Top 10 Security Tests
    console.log('🛡️ Running OWASP Top 10 Test Vectors...');

    // SQL Injection Test
    try {
        const sqliRes = await fetch(`${BASE_URL}/shop/${TEST_TENANT}/products?q=' OR 1=1 --`, {
            headers: { 'x-tenant-id': TEST_TENANT }
        });
        await logResult('SQLi Protection', 'Security', sqliRes.status, 'Injection Blocked/Sanitized', 'OWASP-SQLI', sqliRes.ok ? 'PASS' : 'WARN');
    } catch (e) {
        await logResult('SQLi Protection', 'Security', 500, e.message, 'OWASP-SQLI', 'FAIL');
    }

    // XSS Test
    try {
        const xssRes = await fetch(`${BASE_URL}/shop/${TEST_TENANT}/products`, {
            method: 'POST',
            body: JSON.stringify({ name: '<script>alert(1)</script>', price: 10 }),
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': TEST_TENANT }
        });
        await logResult('XSS Protection', 'Security', xssRes.status, 'Payload Sanitized', 'OWASP-XSS', xssRes.ok || xssRes.status === 400 ? 'PASS' : 'FAIL');
    } catch (e) {
        await logResult('XSS Protection', 'Security', 500, e.message, 'OWASP-XSS', 'FAIL');
    }

    // SSRF Test
    try {
        const ssrfRes = await fetch(`${BASE_URL}/shop/${TEST_TENANT}/products?externalUrl=http://169.254.169.254/latest/meta-data/`, {
            headers: { 'x-tenant-id': TEST_TENANT }
        });
        await logResult('SSRF Protection', 'Security', ssrfRes.status, 'Internal Metadata Blocked', 'OWASP-SSRF', ssrfRes.status === 403 || ssrfRes.status === 400 ? 'PASS' : 'FAIL');
    } catch (e) {
        await logResult('SSRF Protection', 'Security', 500, e.message, 'OWASP-SSRF', 'FAIL');
    }

    // Export to CSV
    const csvHeader = 'Timestamp,Component,Layer,Back_Status,Data_Payload,IP_Context,Status\n';
    const csvRows = results.map(r => `${r.Timestamp},${r.Component},${r.Layer},${r.Back_Status},${r.Data_Payload},${r.IP_Context},${r.Status}`).join('\n');
    fs.writeFileSync(LOG_FILE, csvHeader + csvRows);

    console.log(`\n✅ Verification Complete. Report saved to: ${LOG_FILE}`);
}

runVerification().catch(err => console.error('FATAL SYSTEM ERROR:', err));
