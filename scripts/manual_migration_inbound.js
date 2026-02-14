const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
    console.error("DIRECT_URL not set");
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function migrate() {
    await client.connect();
    console.log("Connected to DB");

    try {
        await client.query('BEGIN');

        // 0. Drop default value first to avoid casting error
        console.log("Dropping default value for status column...");
        await client.query(`ALTER TABLE "inbounds" ALTER COLUMN "status" DROP DEFAULT`);

        // 1. Rename existing type
        console.log("Renaming existing InboundStatus type...");
        // Check if old type exists first? No, assume state is clean or rolled back.
        await client.query(`ALTER TYPE "InboundStatus" RENAME TO "InboundStatus_old"`);

        // 2. Create new type
        console.log("Creating new InboundStatus type...");
        await client.query(`CREATE TYPE "InboundStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'READY_FOR_PAYMENT', 'PAID')`);

        // 3. Update column to use new type with casting
        console.log("Updating column to use new type...");
        await client.query(`
            ALTER TABLE "inbounds" 
            ALTER COLUMN "status" TYPE "InboundStatus" 
            USING (
                CASE
                    WHEN "status"::text = 'PENDING_VERIFICATION' THEN 'PENDING'::"InboundStatus"
                    WHEN "status"::text = 'VERIFIED' THEN 'COMPLETED'::"InboundStatus"
                    WHEN "status"::text = 'REJECTED' THEN 'COMPLETED'::"InboundStatus"
                    ELSE 'PENDING'::"InboundStatus"
                END
            )
        `);

        // 3b. Set new default
        console.log("Setting new default value...");
        await client.query(`ALTER TABLE "inbounds" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);

        // 4. Drop old type
        console.log("Dropping old InboundStatus type...");
        await client.query(`DROP TYPE "InboundStatus_old"`);

        await client.query('COMMIT');
        console.log("Migration successful!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e.message);
        fs.writeFileSync('migration_error.log', `Message: ${e.message}\nStack: ${e.stack}\n`);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
