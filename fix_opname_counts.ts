
import { prisma } from './lib/prisma';

async function main() {
    console.log('🔧 Fixing Stock Opname Counts (Populating All Active Items)...');

    // 1. Fetch all active items
    const allItems = await prisma.item.findMany({
        where: { isActive: true }
    });
    console.log(`found ${allItems.length} active items.`);

    // 2. Fetch all Stock Opnames
    const opnames = await prisma.stockOpname.findMany({
        include: { counts: true }
    });

    console.log(`Found ${opnames.length} Stock Opnames to fix.`);

    for (const opname of opnames) {
        // Only fix if counts are empty OR user requested "all items" (which implies we should ensure coverage)
        // Let's wipe existing counts (if any) to ensure clean state and generic coverage
        console.log(`Processing Opname: ${opname.opnameCode}`);

        // Delete existing counts (optional, but safe to avoid duplicates)
        await prisma.stockOpnameCount.deleteMany({
            where: { stockOpnameId: opname.id }
        });

        // Create counts for ALL active items
        const countsData = allItems.map(item => ({
            stockOpnameId: opname.id,
            itemId: item.id,
            systemQty: item.currentStock, // Snapshot current system stock
            // specific dummy data for some items based on opname status
            ...(opname.status === 'COMPLETED_WITH_ADJUSTMENT' && item.sku === 'ITEM-001' ? {
                // Simulate variance for Laptop in the completed opname
                finalQty: item.currentStock - 1,
                variance: -1,
                isMatching: false
            } : {}),
            ...(opname.status === 'FINALIZED' ? {
                // Perfect match for finalized
                finalQty: item.currentStock,
                variance: 0,
                isMatching: true
            } : {})
        }));

        await prisma.stockOpnameCount.createMany({
            data: countsData
        });

        console.log(`   ✅ Added ${countsData.length} item counts (Scope: All Active Items).`);
    }

    console.log('🎉 Stock Opname Counts fixed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to fix opname counts:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
