
import { prisma } from './lib/prisma';

async function main() {
    console.log('🏭 Updating Vendor Codes to VDR-XXX format...');

    // 1. Fetch current vendors (ordered by createdAt so the oldest gets VDR-001)
    const vendors = await prisma.vendor.findMany({
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${vendors.length} vendors.`);

    let counter = 1;

    for (const vendor of vendors) {
        // Generate new code: VDR-001, VDR-002, etc.
        const newCode = `VDR-${String(counter).padStart(3, '0')}`;

        console.log(`Updating ${vendor.name} (${vendor.code}) -> ${newCode}`);

        // Update
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { code: newCode }
        });

        counter++;
    }

    console.log('✅ Vendor codes updated successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to update vendor codes:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
