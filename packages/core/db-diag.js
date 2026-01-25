const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

async function debug() {
    console.log('🚀 Standalone DB Diagnostic Starting...');

    // Load .env
    dotenv.config({ path: path.join(__dirname, '.env') });

    console.log('🔧 DATABASE_URL:', process.env.DATABASE_URL);

    const client = new PrismaClient({
        log: ['query', 'error', 'warn'],
    });

    try {
        console.log('📡 Attempting $connect()...');
        await client.$connect();
        console.log('✅ Connection Successful!');

        console.log('📊 Running test query (count tenants)...');
        const tenantCount = await client.tenant.count();
        console.log('📈 Tenant Count:', tenantCount);

        await client.$disconnect();
        console.log('👋 Disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        process.exit(1);
    }
}

debug();
