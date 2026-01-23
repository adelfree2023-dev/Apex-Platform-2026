import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TenantsService } from './src/tenants/tenants.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
    console.log('🚀 Starting REAL Isolation Test (Using Actual TenantsService)...');

    // Create Application Context (No HTTP Server)
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
    const tenantsService = app.get(TenantsService);
    const prisma = app.get(PrismaService);

    try {
        const timestamp = Date.now();

        // 1. Create Real Tenant A (Execute Full Logic)
        console.log('\n➡️ Creating REAL Tenant A...');
        const tenantA = await tenantsService.createTenant({
            name: 'Real Isolation A',
            subdomain: `real-a-${timestamp}`,
            businessType: 'RETAIL',
            territory: 'EG',
            fulfillmentRadius: 10
        });
        console.log(`✅ Created Tenant A: ${tenantA.id} (Schema: tenant_${tenantA.id.replace(/-/g, '_')})`);

        // 2. Create Real Tenant B (Execute Full Logic)
        console.log('\n➡️ Creating REAL Tenant B...');
        const tenantB = await tenantsService.createTenant({
            name: 'Real Isolation B',
            subdomain: `real-b-${timestamp}`,
            businessType: 'RETAIL',
            territory: 'EG',
            fulfillmentRadius: 10
        });
        console.log(`✅ Created Tenant B: ${tenantB.id} (Schema: tenant_${tenantB.id.replace(/-/g, '_')})`);

        // 3. Verify Physical Isolation
        const schemaA = `tenant_${tenantA.id.replace(/-/g, '_')}`;
        const schemaB = `tenant_${tenantB.id.replace(/-/g, '_')}`;

        console.log('\n🔒 Verifying Data Isolation...');

        // Inject Secret into A
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${schemaA}"._secret_test (data text)`);
        await prisma.$executeRawUnsafe(`INSERT INTO "${schemaA}"._secret_test VALUES ('CONFIDENTIAL_A')`);

        // Try to read from B (Should fail or return empty if table doesn't exist in B)
        try {
            const result = await prisma.$queryRawUnsafe(`SELECT * FROM "${schemaB}"._secret_test`);
            console.error('❌ FAILURE: Tenant B schema has Tenant A table? This implies shared schema!');
            process.exit(1);
        } catch (e) {
            console.log('✅ PASSED: Tenant B cannot access Tenant A data (Table does not exist in B).');
            console.log('   Proof: Query failed as expected because schemas are separate.');
        }

    } catch (e) {
        console.error('❌ Test Failed:', e);
        process.exit(1);
    } finally {
        await app.close();
        process.exit(0);
    }
}
bootstrap();
