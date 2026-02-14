
import { prisma } from './lib/prisma';
import { POStatus, ApprovalStatus } from '@prisma/client';

async function main() {
    console.log('🛍️ Creating Realistic Purchase Requests...');

    // 1. Get Dependencies
    const user = await prisma.user.findFirst();
    const userId = user?.id;
    if (!userId) throw new Error("No user found.");

    const vendor1 = await prisma.vendor.findFirst({ where: { code: 'VDR-001' } }); // PT Maju Jaya
    const vendor2 = await prisma.vendor.findFirst({ where: { code: 'VDR-002' } }); // CV Berkah Abadi

    const laptop = await prisma.item.findUnique({ where: { sku: 'ITEM-001' } });
    const chair = await prisma.item.findUnique({ where: { sku: 'ITEM-002' } });

    if (!vendor1 || !vendor2 || !laptop || !chair) {
        throw new Error("Missing Master Data. please run restore scripts first.");
    }

    // CLEANUP OLD DUMMY DATA
    console.log('🧹 Cleaning up old dummy data...');
    const deletedPRs = await prisma.purchaseRequest.deleteMany({
        where: {
            prNumber: { contains: 'PR-DUMMY-' }
        }
    });
    console.log(`Deleted ${deletedPRs.count} old dummy PRs.`);


    // Helper to create PR
    const createPr = async (
        idx: number,
        status: POStatus,
        managerStatus: ApprovalStatus,
        vendorId: string,
        note: string,
        itemsRaw: Array<{ item: any, qty: number, price: number }>
    ) => {
        const prNumber = `PR/2026/02/${String(idx).padStart(3, '0')}`;
        console.log(`Creating ${prNumber} [${status}]...`);

        const totalAmount = itemsRaw.reduce((sum, i) => sum + (i.qty * i.price), 0);

        try {
            await prisma.purchaseRequest.create({
                data: {
                    prNumber,
                    vendorId,
                    status,
                    managerApprovalStatus: managerStatus,
                    totalAmount,
                    requestDate: new Date(),
                    createdById: userId,
                    notes: note,
                    // If PO Issued, fill in approval details
                    ...(status === 'PO_ISSUED' || status === 'SENT_TO_VENDOR' || status === 'FULLY_RECEIVED' ? {
                        managerApprovedById: userId,
                        managerApprovedAt: new Date(),
                        managerApprovalStatus: 'APPROVED' as ApprovalStatus,
                        purchasingAcceptedById: userId,
                        purchasingAcceptedAt: new Date(),
                        poNumber: `PO/2026/02/${String(idx).padStart(3, '0')}`,
                        poSentAt: new Date(),
                    } : {}),
                    // If Pending Purchasing, Manager must have approved
                    ...(status === 'PENDING_PURCHASING_APPROVAL' ? {
                        managerApprovedById: userId,
                        managerApprovedAt: new Date(),
                        managerApprovalStatus: 'APPROVED' as ApprovalStatus,
                    } : {}),
                    // If Rejected
                    ...(status === 'REJECTED' ? {
                        managerApprovalStatus: 'REJECTED' as ApprovalStatus,
                        managerNotes: 'Budget exceeded for this quarter.',
                    } : {}),

                    items: {
                        create: itemsRaw.map(i => ({
                            itemId: i.item.id,
                            quantity: i.qty,
                            unitPrice: i.price,
                            totalPrice: i.qty * i.price,
                            verifiedUnitPrice: i.price
                        }))
                    }
                }
            });
        } catch (e: any) {
            console.log(`Skipping ${prNumber}: ${e.message}`);
        }
    };

    let counter = 1;

    // --- 1. DRAFT (Baru dibuat oleh staf) ---
    await createPr(counter++, 'DRAFT', 'DRAFT', vendor1.id, 'Pengadaan Laptop untuk Full Stack Developer baru', [
        { item: laptop, qty: 1, price: 25000000 }
    ]);
    await createPr(counter++, 'DRAFT', 'DRAFT', vendor2.id, 'Kursi tambahan untuk ruang meeting lantai 2', [
        { item: chair, qty: 6, price: 3500000 }
    ]);

    // --- 2. PENDING MANAGER APPROVAL (Menunggu ACC Manager) ---
    await createPr(counter++, 'PENDING_MANAGER_APPROVAL', 'PENDING', vendor1.id, 'Upgrade laptop Tim Desain (Urgent)', [
        { item: laptop, qty: 3, price: 25000000 }
    ]);
    await createPr(counter++, 'PENDING_MANAGER_APPROVAL', 'PENDING', vendor2.id, 'Penggantian kursi rusak di divisi Marketing', [
        { item: chair, qty: 5, price: 3500000 }
    ]);

    // --- 3. PENDING PURCHASING APPROVAL (Manager ACC, tunggu Purchasing proses ke Vendor) ---
    await createPr(counter++, 'PENDING_PURCHASING_APPROVAL', 'APPROVED', vendor1.id, 'Laptop pengganti inventaris hilang (Claim Asuransi)', [
        { item: laptop, qty: 1, price: 25000000 }
    ]);
    await createPr(counter++, 'PENDING_PURCHASING_APPROVAL', 'APPROVED', vendor2.id, 'Kursi ergonomis untuk Tim Finance', [
        { item: chair, qty: 4, price: 3500000 }
    ]);

    // --- 4. PO ISSUED (Sudah jadi PO, dikirim ke Vendor) ---
    await createPr(counter++, 'PO_ISSUED', 'APPROVED', vendor1.id, 'Annual Hardware Refresh 2026 - Batch 1', [
        { item: laptop, qty: 10, price: 24000000 } // Dapat diskon volume
    ]);
    await createPr(counter++, 'PO_ISSUED', 'APPROVED', vendor2.id, 'Furnishing Office Cabang Selatan', [
        { item: chair, qty: 50, price: 3200000 } // Dapat diskon volume
    ]);

    // --- 5. REJECTED (Ditolak Manager) ---
    await createPr(counter++, 'REJECTED', 'REJECTED', vendor1.id, 'Request MacBook Pro M3 Max (Over Spec)', [
        { item: laptop, qty: 2, price: 45000000 }
    ]);
    await createPr(counter++, 'REJECTED', 'REJECTED', vendor2.id, 'Kursi Gaming untuk Ruang Santai (Bukan Prioritas)', [
        { item: chair, qty: 4, price: 8000000 }
    ]);

    console.log('🎉 Realistic Purchase Data created successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
