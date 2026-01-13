// Simple seed script for UOMs
// Run with: npx tsx --env-file=.env scripts/seed-uoms.ts

import { Pool } from 'pg';

const uoms = [
    { symbol: 'pcs', name: 'Pieces' },
    { symbol: 'kg', name: 'Kilogram' },
    { symbol: 'g', name: 'Gram' },
    { symbol: 'l', name: 'Liter' },
    { symbol: 'ml', name: 'Milliliter' },
    { symbol: 'm', name: 'Meter' },
    { symbol: 'cm', name: 'Centimeter' },
    { symbol: 'box', name: 'Box' },
    { symbol: 'pack', name: 'Pack' },
    { symbol: 'unit', name: 'Unit' },
];

async function seed() {
    const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
    });

    console.log('Seeding UOMs...\n');

    for (const uom of uoms) {
        try {
            await pool.query(
                `INSERT INTO uoms (id, symbol, name, "isActive", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
         ON CONFLICT (symbol) DO NOTHING`,
                [uom.symbol, uom.name]
            );
            console.log(`✓ ${uom.symbol} - ${uom.name}`);
        } catch (error) {
            console.error(`✗ Error: ${uom.symbol}`, error);
        }
    }

    await pool.end();
    console.log('\nDone!');
}

seed();
