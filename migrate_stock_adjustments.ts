
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration to StockAdjustmentItem...');

    // Get all existing adjustments with legacy data
    const adjustments: any[] = await prisma.$queryRaw`
        SELECT * FROM "stock_adjustments" 
        WHERE "itemId" IS NOT NULL
    `;

    console.log(`Found ${adjustments.length} adjustments to migrate.`);

    for (const adj of adjustments) {
        // Create Item entry
        const itemId = adj.itemId;
        const qtySystem = adj.qtySystem;
        const qtyInput = adj.qtyInput;
        const qtyVariance = adj.qtyVariance;
        const method = adj.adjustmentMethod || 'REAL_QTY'; // Default
        const delta = adj.deltaType;
        const notes = adj.notes;

        // Insert into stock_adjustment_items
        // We use queryRaw to avoid type errors if client isn't regenerated
        await prisma.$executeRaw`
            INSERT INTO "stock_adjustment_items" (
                "id", 
                "stockAdjustmentId", 
                "itemId", 
                "qtySystem", 
                "qtyInput", 
                "qtyVariance", 
                "adjustmentMethod", 
                "deltaType", 
                "notes",
                "createdAt",
                "updatedAt"
            ) VALUES (
                gen_random_uuid(),
                ${adj.id},
                ${itemId},
                ${qtySystem},
                ${qtyInput},
                ${qtyVariance},
                ${method}::"AdjustmentMethod",
                ${delta}::"DeltaType",
                ${notes},
                NOW(),
                NOW()
            )
        `;

        console.log(`Migrated adjustment ${adj.adjustmentCode}`);
    }

    console.log('Migration complete.');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
