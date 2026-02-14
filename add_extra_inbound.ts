
import { prisma } from './lib/prisma';

async function main() {
    console.log('🚚 Adding ONE MORE Complex Inbound Scenario...');

    const user = await prisma.user.findFirst();
    const userId = user?.id;
    if (!userId) throw new Error("No user found.");

    const vendor = await prisma.vendor.findFirst({ where: { code: 'VDR-001' } }); // PT Maju Jaya
    const laptop = await prisma.item.findUnique({ where: { sku: 'ITEM-001' } });
    const chair = await prisma.item.findUnique({ where: { sku: 'ITEM-002' } });

    if (!vendor || !laptop || !chair) throw new Error("Missing items.");

    // --- CASE 6: MIXED BAG (Komplikasi) ---
    // Skenario: Pesan Laptop & Kursi
    // Laptop: Pesan 20 -> Datang 18 (2 Kurang), dari 18 itu 1 Rusak.
    // Kursi: Pesan 20 -> Datang 20 (Aman).

    console.log('Creating PO-INB-MIX-001...');

    // 1. Create PO
    const po = await prisma.purchaseRequest.create({
        data: {
            prNumber: 'PR-MIX-001',
            poNumber: 'PO-MIX-001',
            vendorId: vendor.id,
            status: 'PO_ISSUED',
            managerApprovalStatus: 'APPROVED',
            totalAmount: 500000000,
            currency: 'IDR',
            poSentAt: new Date(),
            createdById: userId,
            items: {
                create: [
                    { itemId: laptop.id, quantity: 20, unitPrice: 20000000, totalPrice: 400000000 },
                    { itemId: chair.id, quantity: 20, unitPrice: 5000000, totalPrice: 100000000 }
                ]
            }
        }
    });

    console.log('Creating Inbound GRN-MIX-001...');

    // 2. Create Inbound
    await prisma.inbound.create({
        data: {
            grnNumber: 'GRN-2026/02/MIX-001',
            purchaseRequestId: po.id,
            vendorId: vendor.id,
            receiveDate: new Date(),
            status: 'PARTIAL', // Karena ada yang kurang dan reject
            createdById: userId,
            notes: 'Penerimaan Parsial + Ada Barang Rusak.',
            items: {
                create: [
                    {
                        // LAPTOP: Pesan 20, Terima 18, 1 Rusak
                        itemId: laptop.id,
                        expectedQuantity: 20,
                        receivedQuantity: 18,
                        acceptedQuantity: 17, // 18 - 1
                        rejectedQuantity: 1,  // 1 Rusak
                        quantityAddedToStock: 17,
                        status: 'OPEN_ISSUE',
                        discrepancyType: 'DAMAGED', // Dominant issue
                        discrepancyReason: 'Kurang 2 unit (Shortage) DAN 1 unit layar pecah (Damaged).',
                        notes: 'Barang kurang 2, Invoice direvisi.'
                    },
                    {
                        // KURSI: Perfect
                        itemId: chair.id,
                        expectedQuantity: 20,
                        receivedQuantity: 20,
                        acceptedQuantity: 20,
                        rejectedQuantity: 0,
                        quantityAddedToStock: 20,
                        status: 'COMPLETED',
                        discrepancyType: 'NONE'
                    }
                ]
            }
        }
    });

    console.log('🎉 Added Complex "Mixed" Inbound Scenario!');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
