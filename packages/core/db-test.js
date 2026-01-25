const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
    console.log('--- DB Connectivity Test ---');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');

    // Test with 127.0.0.1 if localhost fails
    const urls = [
        process.env.DATABASE_URL,
        process.env.DATABASE_URL?.replace('localhost', '127.0.0.1')
    ].filter(Boolean);

    for (const url of urls) {
        console.log(`Testing URL: ${url.replace(/:[^:]+@/, ':****@')}`);
        const client = new Client({ connectionString: url });
        try {
            await client.connect();
            console.log('✅ Connection Successful!');
            const res = await client.query('SELECT current_database(), current_user, version()');
            console.log('System Info:', res.rows[0]);
            await client.end();
            return;
        } catch (err) {
            console.error('❌ Connection Failed:', err.message);
        }
    }
}

testConnection();
