// Simple seed script for categories
// Run with: npx tsx scripts/seed-categories.ts

import { Pool } from 'pg';

const categories = [
    { code: 'ELEC', name: 'Electronics' },
    { code: 'FURN', name: 'Furniture' },
    { code: 'OFFC', name: 'Office Supplies' },
    { code: 'TOOL', name: 'Tools & Equipment' },
    { code: 'SAFE', name: 'Safety Equipment' },
    { code: 'CHEM', name: 'Chemicals' },
    { code: 'PACK', name: 'Packaging Materials' },
    { code: 'MACH', name: 'Machinery' },
    { code: 'ELCT', name: 'Electrical Components' },
    { code: 'PLMB', name: 'Plumbing Supplies' },
];

async function seed() {
    const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
    });

    console.log('Seeding categories...\n');

    for (const cat of categories) {
        try {
            await pool.query(
                `INSERT INTO categories (id, code, name, "isActive", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
                [cat.code, cat.name]
            );
            console.log(`✓ ${cat.code} - ${cat.name}`);
        } catch (error) {
            console.error(`✗ Error: ${cat.code}`, error);
        }
    }

    await pool.end();
    console.log('\nDone!');
}

seed();
