
import { prisma } from './lib/prisma';
import { InboundStatus, InboundItemStatus, InboundDiscrepancyType } from '@prisma/client';

async function main() {
    console.log('🚚 Creating Inbound (Barang Masuk) Scenarios...');

    const user = await prisma.user.findFirst();
    const userId = user?.id;
    if (!userId) throw new Error("No user found.");

    const vendor = await prisma.vendor.findFirst({ where: { code: 'VDR-001' } }); // PT Maju Jaya
    const vendor2 = await prisma.vendor.findFirst({ where: { code: 'VDR-002' } });

    const laptop = await prisma.item.findUnique({ where: { sku: 'ITEM-001' } });
    const chair = await prisma.item.findUnique({ where: { sku: 'ITEM-002' } });
    const monitor = await prisma.item.findUnique({ where: { sku: 'ITEM-003' } });

    if (!laptop || !chair || !monitor) throw new Error("Missing items.");

    // Helper to Create PO first
    const createPO = async (poNum: string, date: Date, items: any[]) => {
        return await prisma.purchaseRequest.create({
            data: {
                prNumber: `PR-${poNum}`,
                poNumber: poNum,
                vendorId: vendor?.id!,
                status: 'PO_ISSUED',
                managerApprovalStatus: 'APPROVED',
                totalAmount: 100000,
                currency: 'IDR',
                poSentAt: date,
                createdById: userId,
                items: {
                    create: items.map(i => ({
                        itemId: i.itemId,
                        quantity: i.qty,
                        unitPrice: 100000,
                        totalPrice: i.qty * 100000,
                    }))
                }
            }
        });
    };


    // --- CASE 1: PERFECT DELIVERY (Sesuai Pesanan) ---
    // Order 10 Laptops, Received 10, Accepted 10
    const po1 = await createPO('PO-INB-001', new Date('2026-02-01'), [{ itemId: laptop.id, qty: 10 }]);

    await prisma.inbound.create({
        data: {
            grnNumber: 'GRN-2026/02/001',
            purchaseRequestId: po1.id,
            vendorId: vendor?.id!,
            receiveDate: new Date('2026-02-03'),
            status: 'COMPLETED',
            createdById: userId,
            notes: 'Penerimaan barang lengkap & sesuai.',
            items: {
                create: {
                    itemId: laptop.id,
                    expectedQuantity: 10,
                    receivedQuantity: 10,
                    acceptedQuantity: 10,
                    rejectedQuantity: 0,
                    quantityAddedToStock: 10,
                    status: 'COMPLETED',
                    discrepancyType: 'NONE'
                }
            }
        }
    });


    // --- CASE 2: SHORTAGE (Barang Kurang / Pengiriman Parsial) ---
    // Order 50 Chairs, Received 30 (20 Pending)
    const po2 = await createPO('PO-INB-002', new Date('2026-02-05'), [{ itemId: chair.id, qty: 50 }]);

    await prisma.inbound.create({
        data: {
            grnNumber: 'GRN-2026/02/002',
            purchaseRequestId: po2.id,
            vendorId: vendor2?.id!, // Furniture vendor
            receiveDate: new Date('2026-02-07'),
            status: 'PARTIAL',
            createdById: userId,
            notes: 'Pengiriman tahap 1. Sisa 20 unit menyusul minggu depan.',
            items: {
                create: {
                    itemId: chair.id,
                    expectedQuantity: 50,
                    receivedQuantity: 30,
                    acceptedQuantity: 30,
                    rejectedQuantity: 0,
                    quantityAddedToStock: 30, // Only 30 in stock
                    status: 'CLOSED_SHORT', // Or typically PENDING if waiting
                    discrepancyType: 'SHORTAGE',
                    discrepancyReason: 'Vendor stock kosong, dikirim bertahap.'
                }
            }
        }
    });


    // --- CASE 3: DAMAGED ITEMS (Barang Rusak) ---
    // Order 10 Monitors, Received 10, Accepted 8, Rejected 2 (Layar Pecah)
    const po3 = await createPO('PO-INB-003', new Date('2026-02-10'), [{ itemId: monitor.id, qty: 10 }]);

    await prisma.inbound.create({
        data: {
            grnNumber: 'GRN-2026/02/003',
            purchaseRequestId: po3.id,
            vendorId: vendor?.id!,
            receiveDate: new Date('2026-02-12'),
            status: 'PENDING', // Needs resolution for damaged items
            createdById: userId,
            notes: 'Ditemukan 2 unit layar retak saat unboxing.',
            items: {
                create: {
                    itemId: monitor.id,
                    expectedQuantity: 10,
                    receivedQuantity: 10,
                    acceptedQuantity: 8,
                    rejectedQuantity: 2,
                    quantityAddedToStock: 8,
                    status: 'OPEN_ISSUE',
                    discrepancyType: 'DAMAGED',
                    discrepancyReason: 'Layar pecah/retak pengiriman.',
                    discrepancyDocumentUrl: 'broken_monitor.jpg'
                }
            }
        }
    });


    // --- CASE 4: OVERAGE (Barang Berlebih/Bonus) ---
    // Order 100 Chairs, Received 102
    const po4 = await createPO('PO-INB-004', new Date('2026-02-11'), [{ itemId: chair.id, qty: 100 }]);

    await prisma.inbound.create({
        data: {
            grnNumber: 'GRN-2026/02/004',
            purchaseRequestId: po4.id,
            vendorId: vendor2?.id!,
            receiveDate: new Date('2026-02-13'),
            status: 'PENDING', // Need decision on extra items
            createdById: userId,
            notes: 'Kelebihan 2 unit. Konfirmasi vendor: Bonus.',
            items: {
                create: {
                    itemId: chair.id,
                    expectedQuantity: 100,
                    receivedQuantity: 102,
                    acceptedQuantity: 102,
                    rejectedQuantity: 0,
                    quantityAddedToStock: 102,
                    status: 'RESOLVED',
                    discrepancyType: 'OVERAGE',
                    discrepancyReason: 'Bonus dari vendor.'
                }
            }
        }
    });


    // --- CASE 5: WRONG ITEM (Salah Kirim) ---
    // Order 5 Laptops, Vendor sent 5 Monitors instead
    // Note: Schema structure links InboundItem to ItemId. 
    // Usually we record it against the ordered ItemId but mark as Wrong Item.
    const po5 = await createPO('PO-INB-005', new Date('2026-02-12'), [{ itemId: laptop.id, qty: 5 }]);

    await prisma.inbound.create({
        data: {
            grnNumber: 'GRN-2026/02/005',
            purchaseRequestId: po5.id,
            vendorId: vendor?.id!,
            receiveDate: new Date('2026-02-13'),
            status: 'PENDING',
            createdById: userId,
            notes: 'SALAH KIRIM. Pesan Laptop datang Monitor.',
            items: {
                create: {
                    itemId: laptop.id, // Ordered item
                    expectedQuantity: 5,
                    receivedQuantity: 5,
                    acceptedQuantity: 0,
                    rejectedQuantity: 5,
                    quantityAddedToStock: 0,
                    status: 'OPEN_ISSUE',
                    discrepancyType: 'WRONG_ITEM',
                    discrepancyReason: 'Barang fisik yg diterima Monitor LG, bukan Laptop.'
                }
            }
        }
    });

    console.log('🎉 Inbound Scenarios created successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
