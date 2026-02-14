
import { prisma } from './lib/prisma';

async function main() {
    console.log('🤝 Restoring/Creating Master Partners (Mitra)...');

    const partners = [
        {
            code: 'MTR-001',
            name: 'Tokopedia Sejahtera (Retail)',
            address: 'Jl. Jendral Sudirman No. 10, Jakarta Pusat',
            phone: '0811-2233-4455',
            email: 'admin@tokosjahtera.com',
            contactName: 'Bapak Rahmat',
            bankName: 'BCA',
            bankBranch: 'KCP Sudirman',
            bankAccount: '5550123456',
        },
        {
            code: 'MTR-002',
            name: 'CV Bangun Karya (Project)',
            address: 'Jl. Raya Bekasi KM 20, Cakung, Jakarta Timur',
            phone: '021-4601234',
            email: 'procurement@bangunkarya.co.id',
            contactName: 'Ibu Ratna',
            bankName: 'MANDIRI',
            bankBranch: 'Cabang Pulogadung',
            bankAccount: '123-00-9876543-2',
        },
        {
            code: 'MTR-003',
            name: 'Agen Makmur (Distributor)',
            address: 'Komplek Ruko Roxy Mas Blok D1, Jakarta Pusat',
            phone: '0812-9988-7766',
            contactName: 'Ko Handoko',
            email: 'makmur.agen@gmail.com',
            bankName: 'BRI',
            bankBranch: 'Cabang Roxy',
            bankAccount: '0345-01-000123-50-2',
        }
    ];

    for (const p of partners) {
        await prisma.partner.upsert({
            where: { code: p.code },
            update: {
                name: p.name,
                address: p.address,
                phone: p.phone,
                email: p.email,
                contactName: p.contactName,
                bankName: p.bankName,
                bankBranch: p.bankBranch,
                bankAccount: p.bankAccount,
                updatedAt: new Date()
            },
            create: {
                ...p,
                isActive: true
            }
        });
        console.log(`✅ Upserted Partner: ${p.name} (${p.code})`);
    }

    console.log('🎉 Master Partners restored successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to restore partners:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
