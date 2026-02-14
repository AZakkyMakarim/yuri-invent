
import { prisma } from './lib/prisma';

async function main() {
    console.log('🏭 Updating Warehouse Codes to GDG-XXX format...');

    // 1. Fetch current warehouses (ordered by createdAt or name to be deterministic)
    const warehouses = await prisma.warehouse.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${warehouses.length} warehouses.`);

    let counter = 1;

    for (const wh of warehouses) {
        // Generate new code: GDG-001, GDG-002, etc.
        const newCode = `GDG-${String(counter).padStart(3, '0')}`;

        console.log(`Updating ${wh.name} (${wh.code}) -> ${newCode}`);

        // Update
        await prisma.warehouse.update({
            where: { id: wh.id },
            data: { code: newCode }
        });

        counter++;
    }

    console.log('✅ Warehouse codes updated successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to update warehouse codes:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
