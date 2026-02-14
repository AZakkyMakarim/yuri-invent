const { Client } = require('pg');

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
    console.error("DIRECT_URL not set");
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function check() {
    await client.connect();
    try {
        const res = await client.query(`
            SELECT n.nspname AS schema, t.typname AS type 
            FROM pg_type t 
            LEFT JOIN pg_namespace n ON n.oid = t.typnamespace 
            WHERE t.typname IN ('InboundStatus', 'InboundStatus_old')
        `);
        console.log("Found types:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
