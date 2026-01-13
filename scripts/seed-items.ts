// Simple seed script for items
// Run with: npx tsx --env-file=.env scripts/seed-items.ts

import { Pool } from 'pg';

const items = [
    { sku: 'ITM-001', name: 'Laptop Dell XPS 15', categoryCode: 'ELEC', uomSymbol: 'unit', minStock: 5, maxStock: 50 },
    { sku: 'ITM-002', name: 'Wireless Mouse Logitech', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 10, maxStock: 100 },
    { sku: 'ITM-003', name: 'USB-C Hub 7-in-1', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 15, maxStock: 80 },
    { sku: 'ITM-004', name: 'Monitor Samsung 27"', categoryCode: 'ELEC', uomSymbol: 'unit', minStock: 3, maxStock: 30 },
    { sku: 'ITM-005', name: 'Keyboard Mechanical', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 10, maxStock: 60 },
    { sku: 'ITM-006', name: 'Office Chair Ergonomic', categoryCode: 'FURN', uomSymbol: 'unit', minStock: 5, maxStock: 25 },
    { sku: 'ITM-007', name: 'Standing Desk 160cm', categoryCode: 'FURN', uomSymbol: 'unit', minStock: 2, maxStock: 15 },
    { sku: 'ITM-008', name: 'Filing Cabinet 4 Drawer', categoryCode: 'FURN', uomSymbol: 'unit', minStock: 3, maxStock: 20 },
    { sku: 'ITM-009', name: 'Meeting Table 8 Seater', categoryCode: 'FURN', uomSymbol: 'unit', minStock: 1, maxStock: 5 },
    { sku: 'ITM-010', name: 'A4 Copy Paper 80gsm', categoryCode: 'OFFC', uomSymbol: 'box', minStock: 50, maxStock: 500 },
    { sku: 'ITM-011', name: 'Ballpoint Pen Blue', categoryCode: 'OFFC', uomSymbol: 'pack', minStock: 100, maxStock: 1000 },
    { sku: 'ITM-012', name: 'Stapler Heavy Duty', categoryCode: 'OFFC', uomSymbol: 'pcs', minStock: 10, maxStock: 50 },
    { sku: 'ITM-013', name: 'Whiteboard Marker Set', categoryCode: 'OFFC', uomSymbol: 'pack', minStock: 20, maxStock: 100 },
    { sku: 'ITM-014', name: 'Power Drill 18V', categoryCode: 'TOOL', uomSymbol: 'unit', minStock: 5, maxStock: 20 },
    { sku: 'ITM-015', name: 'Socket Wrench Set', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 3, maxStock: 15 },
    { sku: 'ITM-016', name: 'Safety Helmet White', categoryCode: 'SAFE', uomSymbol: 'pcs', minStock: 50, maxStock: 200 },
    { sku: 'ITM-017', name: 'Safety Goggles Clear', categoryCode: 'SAFE', uomSymbol: 'pcs', minStock: 30, maxStock: 150 },
    { sku: 'ITM-018', name: 'Work Gloves Leather', categoryCode: 'SAFE', uomSymbol: 'pack', minStock: 20, maxStock: 100 },
    { sku: 'ITM-019', name: 'First Aid Kit Complete', categoryCode: 'SAFE', uomSymbol: 'pcs', minStock: 5, maxStock: 25 },
    { sku: 'ITM-020', name: 'Industrial Cleaner 5L', categoryCode: 'CHEM', uomSymbol: 'l', minStock: 10, maxStock: 50 },
    { sku: 'ITM-021', name: 'Lubricant Spray WD-40', categoryCode: 'CHEM', uomSymbol: 'pcs', minStock: 20, maxStock: 100 },
    { sku: 'ITM-022', name: 'Bubble Wrap Roll 50m', categoryCode: 'PACK', uomSymbol: 'm', minStock: 100, maxStock: 500 },
    { sku: 'ITM-023', name: 'Cardboard Box Medium', categoryCode: 'PACK', uomSymbol: 'pcs', minStock: 200, maxStock: 1000 },
    { sku: 'ITM-024', name: 'Packing Tape Clear', categoryCode: 'PACK', uomSymbol: 'pcs', minStock: 50, maxStock: 300 },
    { sku: 'ITM-025', name: 'Forklift Battery 48V', categoryCode: 'MACH', uomSymbol: 'unit', minStock: 2, maxStock: 10 },
    { sku: 'ITM-026', name: 'Conveyor Belt Segment', categoryCode: 'MACH', uomSymbol: 'm', minStock: 10, maxStock: 50 },
    { sku: 'ITM-027', name: 'Electric Cable 2.5mm', categoryCode: 'ELCT', uomSymbol: 'm', minStock: 500, maxStock: 2000 },
    { sku: 'ITM-028', name: 'Circuit Breaker 32A', categoryCode: 'ELCT', uomSymbol: 'pcs', minStock: 20, maxStock: 100 },
    { sku: 'ITM-029', name: 'PVC Pipe 4 inch', categoryCode: 'PLMB', uomSymbol: 'm', minStock: 50, maxStock: 200 },
];

async function seed() {
    const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
    });

    console.log('Seeding items...\n');

    // First get category and UOM IDs
    const categoriesResult = await pool.query('SELECT id, code FROM categories');
    const uomsResult = await pool.query('SELECT id, symbol FROM uoms');

    const categoryMap = new Map<string, string>();
    const uomMap = new Map<string, string>();

    for (const row of categoriesResult.rows) {
        categoryMap.set(row.code, row.id);
    }
    for (const row of uomsResult.rows) {
        uomMap.set(row.symbol, row.id);
    }

    let successCount = 0;
    for (const item of items) {
        const categoryId = categoryMap.get(item.categoryCode);
        const uomId = uomMap.get(item.uomSymbol);

        if (!categoryId) {
            console.log(`✗ Skipped ${item.sku}: Category ${item.categoryCode} not found`);
            continue;
        }
        if (!uomId) {
            console.log(`✗ Skipped ${item.sku}: UOM ${item.uomSymbol} not found`);
            continue;
        }

        try {
            await pool.query(
                `INSERT INTO items (id, sku, name, "categoryId", "uomId", "minStockLevel", "maxStockLevel", "currentStock", "isActive", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 0, true, NOW(), NOW())
         ON CONFLICT (sku) DO NOTHING`,
                [item.sku, item.name, categoryId, uomId, item.minStock, item.maxStock]
            );
            console.log(`✓ ${item.sku} - ${item.name}`);
            successCount++;
        } catch (error) {
            console.error(`✗ Error: ${item.sku}`, error);
        }
    }

    await pool.end();
    console.log(`\nDone! Created ${successCount} items.`);
}

seed();
