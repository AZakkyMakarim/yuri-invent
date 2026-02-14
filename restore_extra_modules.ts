
import { prisma } from './lib/prisma';
import { ReturnStatus, ReturnReason, StockOpnameStatus, StockOpnameCount, ApprovalStatus } from '@prisma/client';

async function main() {
    console.log('🔄 Creating Dummy Returns, Opname, and Stock Adjustments (2 datasets per case)...');

    const user = await prisma.user.findFirst();
    const userId = user?.id;
    if (!userId) throw new Error("No user found.");

    // Master Data
    const laptop = await prisma.item.findUnique({ where: { sku: 'ITEM-001' } });
    const chair = await prisma.item.findUnique({ where: { sku: 'ITEM-002' } });
    const monitor = await prisma.item.findUnique({ where: { sku: 'ITEM-003' } });
    const vendor1 = await prisma.vendor.findFirst({ where: { code: 'VDR-001' } });
    const wh = await prisma.warehouse.findFirst({ where: { code: 'GDG-001' } });

    if (!laptop || !chair || !monitor || !vendor1 || !wh) throw new Error("Missing Master Data");

    // --- 1. RETURNS (RETUR) ---
    console.log('--- Returns ---');

    // Create Dummy PR & Inbound for Reference (Needed for Return)
    const prRet = await prisma.purchaseRequest.create({
        data: {
            prNumber: 'PR-RET-REF',
            vendorId: vendor1.id,
            totalAmount: 50000000,
            status: 'PO_ISSUED',
            createdById: userId
        }
    });

    // Helper
    const createReturn = async (code: string, status: ReturnStatus, reason: ReturnReason, item: any, qty: number, note: string) => {
        console.log(`Creating Return ${code}...`);
        await prisma.return.create({
            data: {
                returnCode: code,
                purchaseRequestId: prRet.id,
                vendorId: vendor1.id,
                reason: reason,
                status: status,
                notes: note,
                createdById: userId,
                items: {
                    create: {
                        itemId: item.id,
                        quantity: qty,
                        unitPrice: 1000000,
                        totalPrice: qty * 1000000,
                        reason: note
                    }
                }
            }
        });
    }

    // Case 1: DRAFT (Baru dibuat)
    await createReturn('RET-001', 'DRAFT', 'DAMAGED', monitor, 2, 'Layar pecah saat diterima');
    await createReturn('RET-002', 'DRAFT', 'WRONG_ITEM', chair, 5, 'Salah warna (pesan hitam datang merah)');

    // Case 2: PENDING_APPROVAL (Menunggu ACC)
    await createReturn('RET-003', 'PENDING_APPROVAL', 'LOW_QUALITY', chair, 10, 'Busa kursi kempes/cacat produksi');
    await createReturn('RET-004', 'PENDING_APPROVAL', 'OTHER', laptop, 1, 'Charger tidak berfungsi');

    // Case 3: APPROVED (Disetujui, siap kirim)
    await createReturn('RET-005', 'APPROVED', 'OVERSTOCK', monitor, 3, 'Kelebihan kirim, gudang penuh');
    await createReturn('RET-006', 'APPROVED', 'DAMAGED', laptop, 2, 'Keyboard ghosting parah');


    // --- 2. STOCK OPNAME (AUDIT) ---
    console.log('--- Stock Opname ---');

    const createOpname = async (code: string, status: StockOpnameStatus, note: string) => {
        console.log(`Creating Opname ${code}...`);
        await prisma.stockOpname.create({
            data: {
                opnameCode: code,
                warehouseId: wh.id,
                scheduledDate: new Date(),
                status: status,
                notes: note,
                sheets: {
                    create: {
                        sheetNumber: 1,
                        status: 'DRAFT',
                        items: {
                            create: [
                                { itemId: laptop.id, countedQty: null },
                                { itemId: chair.id, countedQty: null }
                            ]
                        }
                    }
                }
                // We're keeping counts/adjustments simple for now as they are complex relations
            }
        });
    };

    // Case 1: SCHEDULED (Baru dijadwalkan)
    await createOpname('SO-2026-001', 'SCHEDULED', 'Audit Tahunan Gudang Pusat');
    await createOpname('SO-2026-002', 'SCHEDULED', 'Audit Spot-Check Elektronik');

    // Case 2: COUNTING_IN_PROGRESS (Sedang hitung)
    await createOpname('SO-2026-003', 'COUNTING_IN_PROGRESS', 'Opname Q1 - Tim A sedang menghitung');
    await createOpname('SO-2026-004', 'COUNTING_IN_PROGRESS', 'Opname Furniture - Lantai 2');

    // Case 3: COMPLETED (Selesai, ada selisih)
    await createOpname('SO-2026-005', 'COMPLETED_WITH_ADJUSTMENT', 'Audit Selesai - Ada selisih Laptop (-1)');
    await createOpname('SO-2026-006', 'FINALIZED', 'Audit Selesai - Semua Cocok (Perfect)');


    // --- 3. STOCK ADJUSTMENT (PENYESUAIAN) ---
    console.log('--- Stock Adjustment ---');

    const createAdjustment = async (code: string, type: any, method: any, item: any, system: number, input: number, status: ApprovalStatus) => {
        const variance = input - system;
        console.log(`Creating Adjustment ${code}...`);
        await prisma.stockAdjustment.create({
            data: {
                adjustmentCode: code,
                adjustmentType: type,
                adjustmentSource: 'MANUAL',
                adjustmentMethod: method,
                deltaType: variance > 0 ? 'INCREASE' : 'DECREASE',
                itemId: item.id,
                qtySystem: system,
                qtyInput: input,
                qtyVariance: variance,
                status: status,
                createdById: userId,
                notes: `Adjustment ${type}: ${variance} units`
            }
        });
    }

    // Case 1: DRAFT (Pending Submit)
    await createAdjustment('ADJ-001', 'MANUAL_WRITEOFF', 'REAL_QTY', chair, 100, 98, 'DRAFT'); // Hilang 2
    await createAdjustment('ADJ-002', 'DAMAGED', 'REAL_QTY', monitor, 50, 49, 'DRAFT'); // Pecah 1 at gudang

    // Case 2: PENDING (Menunggu Approval)
    await createAdjustment('ADJ-003', 'OTHER', 'DELTA_QTY', laptop, 10, 11, 'PENDING'); // Nemu 1 entah dari mana (+1)
    await createAdjustment('ADJ-004', 'EXPIRED', 'REAL_QTY', chair, 20, 19, 'PENDING'); // 1 Kursi dimakan rayap (-1)

    // Case 3: APPROVED (Sudah update stok)
    await createAdjustment('ADJ-005', 'OPNAME_RESULT', 'REAL_QTY', laptop, 15, 14, 'APPROVED'); // Hasil Opname (-1)
    await createAdjustment('ADJ-006', 'DAMAGED', 'DELTA_QTY', monitor, 10, 8, 'APPROVED'); // Jatuh dari rak (-2)

    console.log('🎉 All Dummy Data (Return, Opname, Adjustment) created successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
