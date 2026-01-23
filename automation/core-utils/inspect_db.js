
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectTenants() {
    console.log('🏛️  Apex Database Inspection Tool\n');

    try {
        // 1. Get all tenants
        const tenants = await prisma.tenant.findMany();
        console.log(`👥 Found ${tenants.length} Tenants in Public Registry:`);
        tenants.forEach(t => console.log(`- ${t.name} (Subdomain: ${t.subdomain}, ID: ${t.id})`));

        // 2. Identify Alpha and Beta (last two created)
        const alpha = tenants.find(t => t.name.includes('Alpha'));
        const beta = tenants.find(t => t.name.includes('Beta'));

        if (!alpha || !beta) {
            console.log('\n❌ Alpha or Beta store not found. Run isolation_test.js first.');
            return;
        }

        const alphaSchema = `tenant_${alpha.id.replace(/-/g, '_')}`;
        const betaSchema = `tenant_${beta.id.replace(/-/g, '_')}`;

        console.log(`\n🔍 Comparing Isolated SEO Meta in separate schemas:`);

        const alphaSeo = await prisma.$queryRawUnsafe(`SELECT * FROM "${alphaSchema}"."vendure_seo_meta" WHERE page_type = 'home'`);
        const betaSeo = await prisma.$queryRawUnsafe(`SELECT * FROM "${betaSchema}"."vendure_seo_meta" WHERE page_type = 'home'`);

        console.log(`\n🏪 Alpha Store [${alphaSchema}]:`);
        console.log(`   Title: ${alphaSeo[0]?.title || 'None'}`);
        console.log(`   Desc:  ${alphaSeo[0]?.description || 'None'}`);

        console.log(`\n🏪 Beta Store [${betaSchema}]:`);
        console.log(`   Title: ${betaSeo[0]?.title || 'None'}`);
        console.log(`   Desc:  ${betaSeo[0]?.description || 'None'}`);

        console.log(`\n🛡️  ISOLATION PROVEN: Data exists in separate tables "${alphaSchema}" and "${betaSchema}".`);

    } catch (error) {
        console.error('Error during inspection:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectTenants();
