
import { prisma } from './lib/prisma';

async function main() {
    console.log('📦 Updating Item Data with Detailed Specifications...');

    // 1. Get Admin Context
    const adminUser = await prisma.user.findFirst();
    const userId = adminUser?.id;
    if (!userId) { throw new Error("No admin user found."); }

    // 2. Fetch dependencies
    const elecCat = await prisma.category.findUnique({ where: { code: 'ELEC' } });
    const urnCat = await prisma.category.findUnique({ where: { code: 'FURN' } });
    const pcsUom = await prisma.uOM.findUnique({ where: { symbol: 'pcs' } });

    // 3. Define Full Item Data
    const items = [
        {
            sku: 'ITEM-001',
            name: 'Laptop Dell XPS 15',
            description: 'High-performance laptop for development.',
            categoryId: elecCat?.id,
            uomId: pcsUom?.id,
            currentStock: 10,
            minStockLevel: 2,
            maxStockLevel: 20,
            brand: 'Dell',
            type: 'XPS 15 9520',
            color: 'Silver',
            weight: 1800, // grams
            length: 34,
            width: 23,
            height: 2,
            barcode: '884116386542',
            movementType: 'FAST',
            imagePath: 'https://images.unsplash.com/photo-1593642632823-8fa7906dd286?auto=format&fit=crop&q=80&w=200'
        },
        {
            sku: 'ITEM-002',
            name: 'Ergonomic Office Chair',
            description: 'Mesh back chair with lumbar support.',
            categoryId: urnCat?.id,
            uomId: pcsUom?.id,
            currentStock: 25,
            minStockLevel: 5,
            maxStockLevel: 50,
            brand: 'Herman Miller',
            type: 'Aeron',
            color: 'Carbon',
            weight: 15000,
            length: 68,
            width: 68,
            height: 100,
            barcode: '998877665544',
            movementType: 'SLOW',
            imagePath: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=200'
        },
        {
            sku: 'ITEM-003',
            name: 'Monitor LG 24" IPS',
            description: 'Full HD IPS Monitor with thin bezels.',
            categoryId: elecCat?.id,
            uomId: pcsUom?.id,
            currentStock: 8,
            minStockLevel: 3,
            maxStockLevel: 15,
            brand: 'LG',
            type: '24MK600',
            color: 'Black',
            weight: 3500,
            length: 54,
            width: 18,
            height: 42,
            barcode: '456123789012',
            movementType: 'MEDIUM',
            imagePath: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=200'
        },
    ];

    for (const item of items) {
        if (!item.categoryId || !item.uomId) continue;

        await prisma.item.upsert({
            where: { sku: item.sku },
            update: {
                name: item.name,
                description: item.description,
                brand: item.brand,
                type: item.type,
                color: item.color,
                weight: item.weight,
                length: item.length,
                width: item.width,
                height: item.height,
                barcode: item.barcode,
                movementType: item.movementType,
                imagePath: item.imagePath,
                updatedAt: new Date(),
            },
            create: {
                ...item as any,
                isActive: true,
                createdById: userId
            }
        });
    }

    console.log('✅ Updated items with full specifications.');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
