
import { prisma } from './lib/prisma';

// Helper to create random string
const randomStr = () => Math.random().toString(36).substring(7);

async function main() {
    console.log('🔄 Restoring Master Data...');

    // 1. Get Admin User for `createdById`
    const adminUser = await prisma.user.findFirst();
    const userId = adminUser?.id;

    if (!userId) {
        console.error('❌ No user found. Please restore users first.');
        return;
    }

    // 2. Restore Categories
    console.log('📦 Restoring Categories...');
    const categories = [
        { code: 'ELEC', name: 'Electronics' },
        { code: 'FURN', name: 'Furniture' },
        { code: 'STAT', name: 'Stationery' },
        { code: 'RAW', name: 'Raw Material' },
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { code: cat.code },
            update: {},
            create: { ...cat, createdById: userId }
        });
    }

    // 3. Restore UOMs
    console.log('📏 Restoring UOMs...');
    const uoms = [
        { name: 'Pieces', symbol: 'pcs' },
        { name: 'Kilogram', symbol: 'kg' },
        { name: 'Box', symbol: 'box' },
        { name: 'Liter', symbol: 'ltr' },
    ];

    for (const uom of uoms) {
        await prisma.uOM.upsert({
            where: { symbol: uom.symbol },
            update: {},
            create: { ...uom, createdById: userId }
        });
    }

    // 4. Restore Vendors
    console.log('🏭 Restoring Vendors...');
    const vendors = [
        { code: 'V-001', name: 'PT Maju Jaya', vendorType: 'NON_SPK', email: 'sales@majujaya.com' },
        { code: 'V-002', name: 'CV Berkah Abadi', vendorType: 'SPK', email: 'admin@berkah.com' },
        { code: 'V-003', name: 'Toko Sinar Mas', vendorType: 'NON_SPK', email: 'sinarmas@gmail.com' },
    ];

    for (const v of vendors) {
        await prisma.vendor.upsert({
            where: { code: v.code },
            update: {},
            create: {
                ...v,
                vendorType: v.vendorType as any,
                createdById: userId
            }
        });
    }

    // 5. Restore Items (Requires Category & UOM IDs)
    console.log('📦 Restoring Items...');
    const elecCat = await prisma.category.findUnique({ where: { code: 'ELEC' } });
    const urnCat = await prisma.category.findUnique({ where: { code: 'FURN' } });
    const pcsUom = await prisma.uOM.findUnique({ where: { symbol: 'pcs' } });

    if (elecCat && urnCat && pcsUom) {
        const items = [
            { sku: 'ITEM-001', name: 'Laptop Dell XPS', categoryId: elecCat.id, uomId: pcsUom.id, currentStock: 10, minStockLevel: 2 },
            { sku: 'ITEM-002', name: 'Office Chair', categoryId: urnCat.id, uomId: pcsUom.id, currentStock: 25, minStockLevel: 5 },
            { sku: 'ITEM-003', name: 'Monitor LG 24"', categoryId: elecCat.id, uomId: pcsUom.id, currentStock: 8, minStockLevel: 3 },
        ];

        for (const item of items) {
            await prisma.item.upsert({
                where: { sku: item.sku },
                update: {},
                create: { ...item, createdById: userId }
            });
        }
    }

    console.log('🎉 Master Data Restored Successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to restore master data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
