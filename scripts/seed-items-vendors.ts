// Comprehensive seed script for Items and Vendors
// Run with: npx tsx --env-file=.env scripts/seed-items-vendors.ts

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 30 Items spanning multiple categories
const items = [
    // Electronics (10 items)
    { sku: 'ITM-001', name: 'Laptop Dell XPS 15', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 5, maxStock: 50 },
    { sku: 'ITM-002', name: 'Wireless Mouse Logitech MX Master', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 10, maxStock: 100 },
    { sku: 'ITM-003', name: 'USB-C Hub 7-in-1', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 15, maxStock: 80 },
    { sku: 'ITM-004', name: 'Monitor Samsung 27" 4K', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 3, maxStock: 30 },
    { sku: 'ITM-005', name: 'Keyboard Mechanical RGB', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 10, maxStock: 60 },
    { sku: 'ITM-006', name: 'Webcam Logitech C920', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 8, maxStock: 40 },
    { sku: 'ITM-007', name: 'Headset Wireless Sony WH-1000XM4', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 5, maxStock: 35 },
    { sku: 'ITM-008', name: 'External SSD 1TB Samsung', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 12, maxStock: 70 },
    { sku: 'ITM-009', name: 'Printer HP LaserJet Pro', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 4, maxStock: 20 },
    { sku: 'ITM-010', name: 'Power Bank 20000mAh', categoryCode: 'ELEC', uomSymbol: 'pcs', minStock: 20, maxStock: 100 },

    // Furniture (6 items)
    { sku: 'ITM-011', name: 'Office Chair Ergonomic Premium', categoryCode: 'FURN', uomSymbol: 'pcs', minStock: 5, maxStock: 25 },
    { sku: 'ITM-012', name: 'Standing Desk Adjustable 160cm', categoryCode: 'FURN', uomSymbol: 'pcs', minStock: 2, maxStock: 15 },
    { sku: 'ITM-013', name: 'Filing Cabinet 4 Drawer Steel', categoryCode: 'FURN', uomSymbol: 'pcs', minStock: 3, maxStock: 20 },
    { sku: 'ITM-014', name: 'Meeting Table 8 Seater Oak', categoryCode: 'FURN', uomSymbol: 'pcs', minStock: 1, maxStock: 5 },
    { sku: 'ITM-015', name: 'Bookshelf 5 Tier Wooden', categoryCode: 'FURN', uomSymbol: 'pcs', minStock: 4, maxStock: 18 },
    { sku: 'ITM-016', name: 'Whiteboard Mobile 120x180cm', categoryCode: 'FURN', uomSymbol: 'pcs', minStock: 3, maxStock: 12 },

    // Office Supplies (6 items)
    { sku: 'ITM-017', name: 'A4 Copy Paper 80gsm Ream', categoryCode: 'STAT', uomSymbol: 'box', minStock: 50, maxStock: 500 },
    { sku: 'ITM-018', name: 'Ballpoint Pen Blue Box of 50', categoryCode: 'STAT', uomSymbol: 'box', minStock: 100, maxStock: 1000 },
    { sku: 'ITM-019', name: 'Stapler Heavy Duty Metal', categoryCode: 'STAT', uomSymbol: 'pcs', minStock: 10, maxStock: 50 },
    { sku: 'ITM-020', name: 'Whiteboard Marker Set 4 Colors', categoryCode: 'STAT', uomSymbol: 'box', minStock: 20, maxStock: 100 },
    { sku: 'ITM-021', name: 'Sticky Notes Pack 100 Sheets', categoryCode: 'STAT', uomSymbol: 'box', minStock: 30, maxStock: 200 },
    { sku: 'ITM-022', name: 'File Folder A4 Plastic Set of 10', categoryCode: 'STAT', uomSymbol: 'box', minStock: 25, maxStock: 150 },

    // Tools (8 items)
    { sku: 'ITM-023', name: 'Power Drill 18V Cordless', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 5, maxStock: 20 },
    { sku: 'ITM-024', name: 'Socket Wrench Set 42 Pieces', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 3, maxStock: 15 },
    { sku: 'ITM-025', name: 'Digital Multimeter Fluke', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 6, maxStock: 25 },
    { sku: 'ITM-026', name: 'Screwdriver Set Precision 32pcs', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 8, maxStock: 40 },
    { sku: 'ITM-027', name: 'Wire Cutter Professional 8 inch', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 10, maxStock: 50 },
    { sku: 'ITM-028', name: 'Measuring Tape 10m Heavy Duty', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 15, maxStock: 80 },
    { sku: 'ITM-029', name: 'Safety Helmet White ANSI Certified', categoryCode: 'TOOL', uomSymbol: 'pcs', minStock: 50, maxStock: 200 },
    { sku: 'ITM-030', name: 'Work Gloves Leather Pair', categoryCode: 'TOOL', uomSymbol: 'box', minStock: 20, maxStock: 100 },
];

// 10 Vendors with variety
const vendors = [
    {
        code: 'VEN-001',
        name: 'PT Tech Solutions Indonesia',
        vendorType: 'SPK' as const,
        bank: 'BCA' as const,
        bankBranch: 'Jakarta Sudirman',
        bankAccount: '1234567890',
        address: 'Jl. Sudirman No. 123, Jakarta Selatan',
        phone: '+62 21 5551234',
        email: 'sales@techsolutions.co.id',
        contactName: 'Budi Santoso',
    },
    {
        code: 'VEN-002',
        name: 'CV Maju Jaya Elektronik',
        vendorType: 'NON_SPK' as const,
        bank: 'MANDIRI' as const,
        bankBranch: 'Bandung Dago',
        bankAccount: '9876543210',
        address: 'Jl. Dago No. 45, Bandung',
        phone: '+62 22 4441234',
        email: 'order@majujaya.com',
        contactName: 'Siti Nurhaliza',
    },
    {
        code: 'VEN-003',
        name: 'PT Furniture Nusantara',
        vendorType: 'SPK' as const,
        bank: 'BNI' as const,
        bankBranch: 'Surabaya Tunjungan',
        bankAccount: '5555666677',
        address: 'Jl. Tunjungan Plaza, Surabaya',
        phone: '+62 31 7771234',
        email: 'info@furniturenusantara.id',
        contactName: 'Andi Wijaya',
    },
    {
        code: 'VEN-004',
        name: 'Toko Alat Tulis Sejahtera',
        vendorType: 'NON_SPK' as const,
        bank: 'BRI' as const,
        bankBranch: 'Yogyakarta Malioboro',
        bankAccount: '3333444455',
        address: 'Jl. Malioboro No. 88, Yogyakarta',
        phone: '+62 274 5551234',
        email: 'contact@sejahtera-stationery.com',
        contactName: 'Dewi Lestari',
    },
    {
        code: 'VEN-005',
        name: 'PT Prima Hardware Tools',
        vendorType: 'SPK' as const,
        bank: 'BCA' as const,
        bankBranch: 'Semarang Simpang Lima',
        bankAccount: '7777888899',
        address: 'Jl. Pandanaran No. 12, Semarang',
        phone: '+62 24 6661234',
        email: 'sales@primahardware.co.id',
        contactName: 'Rizki Fauzan',
    },
    {
        code: 'VEN-006',
        name: 'CV Berkah Computer',
        vendorType: 'NON_SPK' as const,
        bank: 'MANDIRI' as const,
        bankBranch: 'Medan Iskandar Muda',
        bankAccount: '1111222233',
        address: 'Jl. Iskandar Muda No. 67, Medan',
        phone: '+62 61 8881234',
        email: 'order@berkahcomputer.com',
        contactName: 'Hendra Gunawan',
    },
    {
        code: 'VEN-007',
        name: 'PT Office Pro Supplies',
        vendorType: 'SPK' as const,
        bank: 'BNI' as const,
        bankBranch: 'Denpasar Renon',
        bankAccount: '4444555566',
        address: 'Jl. Raya Puputan No. 34, Denpasar',
        phone: '+62 361 9991234',
        email: 'info@officepro.id',
        contactName: 'Made Suardana',
    },
    {
        code: 'VEN-008',
        name: 'Toko Perlengkapan Kantor Jaya',
        vendorType: 'NON_SPK' as const,
        bank: 'BRI' as const,
        bankBranch: 'Makassar Panakkukang',
        bankAccount: '6666777788',
        address: 'Jl. Boulevard No. 99, Makassar',
        phone: '+62 411 3331234',
        email: 'sales@perlengkapankantor.co.id',
        contactName: 'Nurul Hidayah',
    },
    {
        code: 'VEN-009',
        name: 'PT Global Tech Distributor',
        vendorType: 'SPK' as const,
        bank: 'BCA' as const,
        bankBranch: 'Palembang Sudirman',
        bankAccount: '8888999900',
        address: 'Jl. Jendral Sudirman No. 156, Palembang',
        phone: '+62 711 2221234',
        email: 'procurement@globaltech.id',
        contactName: 'Agus Setiawan',
    },
    {
        code: 'VEN-010',
        name: 'CV Sukses Bersama Equipment',
        vendorType: 'NON_SPK' as const,
        bank: 'MANDIRI' as const,
        bankBranch: 'Pontianak Ahmad Yani',
        bankAccount: '2222333344',
        address: 'Jl. Ahmad Yani No. 77, Pontianak',
        phone: '+62 561 4441234',
        email: 'info@suksesbersama.com',
        contactName: 'Lestari Wulandari',
    },
];

// Define which items each vendor supplies (variety of 3-8 items per vendor)
const vendorItemMappings = [
    // VEN-001 (Tech Solutions) - Electronics specialist
    { vendorCode: 'VEN-001', itemSKUs: ['ITM-001', 'ITM-002', 'ITM-003', 'ITM-004', 'ITM-005', 'ITM-008', 'ITM-009', 'ITM-010'] },
    // VEN-002 (Maju Jaya) - Electronics variety
    { vendorCode: 'VEN-002', itemSKUs: ['ITM-002', 'ITM-004', 'ITM-006', 'ITM-007', 'ITM-010'] },
    // VEN-003 (Furniture Nusantara) - Furniture specialist
    { vendorCode: 'VEN-003', itemSKUs: ['ITM-011', 'ITM-012', 'ITM-013', 'ITM-014', 'ITM-015', 'ITM-016'] },
    // VEN-004 (Alat Tulis) - Office supplies specialist
    { vendorCode: 'VEN-004', itemSKUs: ['ITM-017', 'ITM-018', 'ITM-019', 'ITM-020', 'ITM-021', 'ITM-022'] },
    // VEN-005 (Prima Hardware) - Tools specialist
    { vendorCode: 'VEN-005', itemSKUs: ['ITM-023', 'ITM-024', 'ITM-025', 'ITM-026', 'ITM-027', 'ITM-028', 'ITM-029', 'ITM-030'] },
    // VEN-006 (Berkah Computer) - Electronics
    { vendorCode: 'VEN-006', itemSKUs: ['ITM-001', 'ITM-003', 'ITM-005', 'ITM-008', 'ITM-009'] },
    // VEN-007 (Office Pro) - Mixed office items
    { vendorCode: 'VEN-007', itemSKUs: ['ITM-011', 'ITM-016', 'ITM-017', 'ITM-019', 'ITM-020', 'ITM-022'] },
    // VEN-008 (Perlengkapan Kantor) - Office variety
    { vendorCode: 'VEN-008', itemSKUs: ['ITM-012', 'ITM-013', 'ITM-018', 'ITM-021'] },
    // VEN-009 (Global Tech) - Tech distributor
    { vendorCode: 'VEN-009', itemSKUs: ['ITM-001', 'ITM-004', 'ITM-006', 'ITM-007', 'ITM-008'] },
    // VEN-010 (Sukses Bersama) - Equipment variety
    { vendorCode: 'VEN-010', itemSKUs: ['ITM-014', 'ITM-015', 'ITM-023', 'ITM-025', 'ITM-029', 'ITM-030'] },
];

// Generate realistic COGS (Cost of Goods Sold) prices in IDR
function generateCOGS(itemName: string, vendorIndex: number): number {
    const basePrices: Record<string, number> = {
        'Laptop': 12000000,
        'Monitor': 3500000,
        'Mouse': 450000,
        'Keyboard': 850000,
        'USB-C Hub': 350000,
        'Webcam': 1200000,
        'Headset': 4500000,
        'SSD': 1800000,
        'Printer': 2500000,
        'Power Bank': 250000,
        'Chair': 2500000,
        'Desk': 4500000,
        'Cabinet': 3200000,
        'Table': 7500000,
        'Bookshelf': 1200000,
        'Whiteboard': 850000,
        'Paper': 45000,
        'Pen': 35000,
        'Stapler': 65000,
        'Marker': 42000,
        'Sticky Notes': 28000,
        'Folder': 55000,
        'Drill': 1800000,
        'Wrench': 950000,
        'Multimeter': 750000,
        'Screwdriver': 285000,
        'Cutter': 165000,
        'Tape': 45000,
        'Helmet': 125000,
        'Gloves': 95000,
    };

    // Find base price by matching item name keywords
    let basePrice = 100000; // Default
    for (const [key, price] of Object.entries(basePrices)) {
        if (itemName.includes(key)) {
            basePrice = price;
            break;
        }
    }

    // Add vendor-specific variation (±5-15%)
    const variation = 0.05 + (vendorIndex % 3) * 0.05; // 5%, 10%, or 15%
    const direction = vendorIndex % 2 === 0 ? 1 : -1;
    return Math.round(basePrice * (1 + direction * variation));
}

async function seed() {
    console.log('🌱 Starting comprehensive seed for Items and Vendors...\n');

    try {
        // 1. Ensure categories and UOMs exist
        console.log('📦 Ensuring categories exist...');
        await prisma.category.createMany({
            data: [
                { code: 'ELEC', name: 'Electronics' },
                { code: 'FURN', name: 'Furniture' },
                { code: 'STAT', name: 'Stationery' },
                { code: 'TOOL', name: 'Tools & Equipment' },
            ],
            skipDuplicates: true,
        });

        console.log('📏 Ensuring UOMs exist...');
        await prisma.uOM.createMany({
            data: [
                { name: 'Pieces', symbol: 'pcs' },
                { name: 'Box', symbol: 'box' },
                { name: 'Kilogram', symbol: 'kg' },
                { name: 'Liter', symbol: 'l' },
                { name: 'Meter', symbol: 'm' },
            ],
            skipDuplicates: true,
        });

        // Get all categories and UOMs for mapping
        const categories = await prisma.category.findMany();
        const uoms = await prisma.uOM.findMany();

        const categoryMap = new Map(categories.map(c => [c.code, c.id]));
        const uomMap = new Map(uoms.map(u => [u.symbol, u.id]));

        // 2. Create items
        console.log('\n📝 Creating 30 items...');
        let itemCount = 0;
        for (const item of items) {
            const categoryId = categoryMap.get(item.categoryCode);
            const uomId = uomMap.get(item.uomSymbol);

            if (!categoryId || !uomId) {
                console.log(`  ✗ Skipped ${item.sku}: Missing category or UOM`);
                continue;
            }

            try {
                await prisma.item.upsert({
                    where: { sku: item.sku },
                    update: {},
                    create: {
                        sku: item.sku,
                        name: item.name,
                        categoryId,
                        uomId,
                        minStockLevel: item.minStock,
                        maxStockLevel: item.maxStock,
                        currentStock: 0,
                        isActive: true,
                    },
                });
                console.log(`  ✓ ${item.sku} - ${item.name}`);
                itemCount++;
            } catch (error) {
                console.error(`  ✗ Error: ${item.sku}`, error);
            }
        }
        console.log(`✅ Created ${itemCount} items`);

        // 3. Create vendors
        console.log('\n🏢 Creating 10 vendors...');
        let vendorCount = 0;
        for (const vendor of vendors) {
            try {
                await prisma.vendor.upsert({
                    where: { code: vendor.code },
                    update: {},
                    create: {
                        code: vendor.code,
                        name: vendor.name,
                        vendorType: vendor.vendorType,
                        bank: vendor.bank,
                        bankBranch: vendor.bankBranch,
                        bankAccount: vendor.bankAccount,
                        address: vendor.address,
                        phone: vendor.phone,
                        email: vendor.email,
                        contactName: vendor.contactName,
                        isActive: true,
                    },
                });
                console.log(`  ✓ ${vendor.code} - ${vendor.name}`);
                vendorCount++;
            } catch (error) {
                console.error(`  ✗ Error: ${vendor.code}`, error);
            }
        }
        console.log(`✅ Created ${vendorCount} vendors`);

        // 4. Create vendor-item associations with COGS
        console.log('\n🔗 Creating vendor-item associations with pricing...');
        const allItems = await prisma.item.findMany();
        const allVendors = await prisma.vendor.findMany();

        const itemSKUMap = new Map(allItems.map(i => [i.sku, i.id]));
        const vendorCodeMap = new Map(allVendors.map(v => [v.code, v.id]));

        let associationCount = 0;
        for (const mapping of vendorItemMappings) {
            const vendorId = vendorCodeMap.get(mapping.vendorCode);
            if (!vendorId) continue;

            const vendorIndex = vendors.findIndex(v => v.code === mapping.vendorCode);

            for (const itemSKU of mapping.itemSKUs) {
                const itemId = itemSKUMap.get(itemSKU);
                if (!itemId) continue;

                const item = allItems.find(i => i.id === itemId);
                if (!item) continue;

                const cogs = generateCOGS(item.name, vendorIndex);

                try {
                    await prisma.vendorItem.upsert({
                        where: {
                            vendorId_itemId: {
                                vendorId,
                                itemId,
                            },
                        },
                        update: {
                            cogsPerUom: cogs,
                        },
                        create: {
                            vendorId,
                            itemId,
                            cogsPerUom: cogs,
                            isActive: true,
                        },
                    });
                    console.log(`  ✓ ${mapping.vendorCode} → ${itemSKU} (COGS: Rp ${cogs.toLocaleString('id-ID')})`);
                    associationCount++;
                } catch (error) {
                    console.error(`  ✗ Error linking ${mapping.vendorCode} → ${itemSKU}`, error);
                }
            }
        }
        console.log(`✅ Created ${associationCount} vendor-item associations`);

        console.log('\n🎉 Seed completed successfully!\n');
        console.log('Summary:');
        console.log(`  - ${itemCount} items created`);
        console.log(`  - ${vendorCount} vendors created`);
        console.log(`  - ${associationCount} vendor-item associations created`);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

seed()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
