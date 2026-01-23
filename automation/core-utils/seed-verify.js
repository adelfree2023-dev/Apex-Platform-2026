const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const id = 'ae9f6640-5e60-4b2a-9e6b-a2d895498244';
    const subdomain = 'store-ae9f6640'; // Matches query header in unified_verify_45.js

    console.log(`🌱 Seeding Test Tenant: ${id} (${subdomain})...`);

    try {
        // 1. Upsert Tenant
        await prisma.tenant.upsert({
            where: { id },
            update: {
                status: 'ACTIVE',
                subdomain
            },
            create: {
                id,
                name: 'Verification Test Store',
                subdomain,
                status: 'ACTIVE',
                territory: 'US',
                businessType: 'RETAIL'
            }
        });
        console.log('✅ Tenant record verified.');

        // 2. Ensure Schema Exists
        const schemaName = `tenant_${id.replace(/-/g, '_')}`;
        await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`✅ Schema "${schemaName}" verified.`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
