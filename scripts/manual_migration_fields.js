const { Client } = require('pg');

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
        console.log("Adding values to InboundDiscrepancyType...");
        // Use separate query calls. PG 12+ supports IF NOT EXISTS for ADD VALUE
        try {
            await client.query("ALTER TYPE \"InboundDiscrepancyType\" ADD VALUE IF NOT EXISTS 'OVERAGE'");
        } catch (e) { console.log("Overage exists or error", e.message); }
        try {
            await client.query("ALTER TYPE \"InboundDiscrepancyType\" ADD VALUE IF NOT EXISTS 'WRONG_ITEM'");
        } catch (e) { console.log("Wrong item exists or error", e.message); }
        try {
            await client.query("ALTER TYPE \"InboundDiscrepancyType\" ADD VALUE IF NOT EXISTS 'DAMAGED'");
        } catch (e) { console.log("Damaged exists or error", e.message); }

        console.log("Creating InboundItemStatus...");
        try {
            await client.query("CREATE TYPE \"InboundItemStatus\" AS ENUM ('OPEN_ISSUE', 'COMPLETED', 'RESOLVED', 'CLOSED_SHORT')");
        } catch (e) { console.log("InboundItemStatus exists or error", e.message); }

        console.log("Adding columns to inbounds...");
        await client.query("ALTER TABLE \"inbounds\" ADD COLUMN IF NOT EXISTS \"paymentAmount\" DECIMAL(18,2)");
        await client.query("ALTER TABLE \"inbounds\" ADD COLUMN IF NOT EXISTS \"paymentDate\" TIMESTAMP(3)");
        await client.query("ALTER TABLE \"inbounds\" ADD COLUMN IF NOT EXISTS \"paymentProofUrl\" TEXT");

        console.log("Adding columns to inbound_items...");
        await client.query("ALTER TABLE \"inbound_items\" ADD COLUMN IF NOT EXISTS \"quantityAddedToStock\" INTEGER NOT NULL DEFAULT 0");

        // Ensure InboundItemStatus type is used
        await client.query("ALTER TABLE \"inbound_items\" ADD COLUMN IF NOT EXISTS \"status\" \"InboundItemStatus\" NOT NULL DEFAULT 'OPEN_ISSUE'");

        console.log("Migration columns successful!");
    } catch (e) {
        console.error("Migration failed:", e);
        // Don't exit 1 if it's just "already exists" errors that we caught, but here we catch specific ones.
        // If main blocks fail, we exit.
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
