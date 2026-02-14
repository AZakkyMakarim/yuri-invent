
import { prisma } from './lib/prisma';
import { BankName, VendorType } from '@prisma/client';

async function main() {
    console.log('🏭 Enriching Master Vendor and Creating Master Warehouse...');

    // 1. Get Admin Context
    const adminUser = await prisma.user.findFirst();
    const userId = adminUser?.id;
    if (!userId) { throw new Error("No admin user found."); }

    // --- ENRICH VENDORS ---
    console.log('🛠 Updating Vendor details...');

    // Vendor 1: PT Maju Jaya (Non-SPK)
    await prisma.vendor.update({
        where: { code: 'V-001' },
        data: {
            address: 'Jl. Industri Raya No. 45, Cikarang, Jawa Barat',
            phone: '+62 21 8990 1234',
            contactName: 'Budi Santoso',
            bank: 'BCA',
            bankName: 'BCA', // Legacy field
            bankAccount: '1234567890',
            bankBranch: 'Cabang Cikarang Pusat',
            link: 'https://majujaya.com',
            vendorType: 'NON_SPK'
        }
    });

    // Vendor 2: CV Berkah Abadi (SPK)
    await prisma.vendor.update({
        where: { code: 'V-002' },
        data: {
            address: 'Ruko Glodok Plaza Blok F No. 12, Jakarta Barat',
            phone: '+62 21 6688 9900',
            contactName: 'Siti Aminah',
            bank: 'MANDIRI',
            bankName: 'MANDIRI',
            bankAccount: '166-00-0987654-3',
            bankBranch: 'KCP Glodok',
            link: 'https://berkahabadi.co.id',
            vendorType: 'SPK'
        }
    });

    // Vendor 3: Toko Sinar Mas (Non-SPK)
    await prisma.vendor.update({
        where: { code: 'V-003' },
        data: {
            address: 'Jl. Mangga Dua Raya, ITC Mangga Dua Lt. 2 Blok C, Jakarta Pusat',
            phone: '0812-3456-7890',
            contactName: 'Ko Ming',
            bank: 'BNI',
            bankName: 'BNI',
            bankAccount: '009-876-5432',
            bankBranch: 'Cabang Mangga Dua',
            link: 'https://tokopedia.com/sinarmas',
            vendorType: 'NON_SPK'
        }
    });

    // --- CREATE WAREHOUSES ---
    console.log('🏭 Creating Warehouses...');

    const warehouses = [
        {
            code: 'WH-MAIN',
            name: 'Gudang Pusat (Main Warehouse)',
            type: 'MAIN',
            address: 'Kawasan Industri Pulo Gadung, Jakarta Timur',
            isDefault: true
        },
        {
            code: 'WH-BR-01',
            name: 'Gudang Cabang Selatan (South Branch)',
            type: 'BRANCH',
            address: 'Jl. Fatmawati No. 88, Jakarta Selatan',
            isDefault: false
        },
        {
            code: 'WH-DMG',
            name: 'Gudang Barang Rusak (Damaged Goods)',
            type: 'BRANCH',
            address: 'Area Belakang Gudang Pusat',
            isDefault: false
        }
    ];

    for (const wh of warehouses) {
        await prisma.warehouse.upsert({
            where: { code: wh.code },
            update: {
                name: wh.name,
                type: wh.type,
                address: wh.address,
                isDefault: wh.isDefault,
                updatedAt: new Date()
            },
            create: {
                ...wh,
                isActive: true
            }
        });
    }

    console.log('✅ Vendor and Warehouse data enriched successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
