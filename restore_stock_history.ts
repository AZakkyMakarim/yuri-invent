
import { prisma } from './lib/prisma';
import { StockMovementType } from '@prisma/client';

async function main() {
    console.log('📈 Generating Stock Cards and Warehouse Stocks...');

    // 1. Fetch Dependencies
    const user = await prisma.user.findFirst();
    const userId = user?.id;

    const laptop = await prisma.item.findUnique({ where: { sku: 'ITEM-001' } });
    const chair = await prisma.item.findUnique({ where: { sku: 'ITEM-002' } });
    const monitor = await prisma.item.findUnique({ where: { sku: 'ITEM-003' } });

    const whMain = await prisma.warehouse.findUnique({ where: { code: 'GDG-001' } });
    const whBranch = await prisma.warehouse.findUnique({ where: { code: 'GDG-002' } });
    const whDamaged = await prisma.warehouse.findUnique({ where: { code: 'GDG-003' } });

    if (!user || !laptop || !chair || !monitor || !whMain || !whBranch || !whDamaged) {
        throw new Error("Missing master data. Please restore master data first.");
    }

    // --- HELPER: Create Movement ---
    const recordMovement = async (
        date: Date,
        item: any,
        warehouse: any,
        type: StockMovementType,
        qty: number,
        refType: string,
        refId: string,
        note: string,
        currentStockBefore: number
    ) => {
        const qtyChange = (type === 'INBOUND' || type === 'ADJUSTMENT_IN' || type === 'RETURN_IN') ? qty : -qty;
        const stockAfter = currentStockBefore + qtyChange;

        await prisma.stockCard.create({
            data: {
                itemId: item.id,
                warehouseId: warehouse.id,
                movementType: type,
                referenceType: refType,
                referenceId: refId,
                quantityBefore: currentStockBefore,
                quantityChange: qtyChange,
                quantityAfter: stockAfter,
                transactionDate: date,
                notes: note,
                createdAt: date
            }
        });

        return stockAfter;
    };

    // --- SCENARIO 1: LAPTOP (Distributed Stock) ---
    console.log('Processing Laptop History...');
    let stockLaptopMain = 0;
    let stockLaptopBranch = 0;
    let stockLaptopDamaged = 0;

    // 1. Opening Balance (Main)
    stockLaptopMain = await recordMovement(new Date('2026-01-01'), laptop, whMain, 'ADJUSTMENT_IN', 5, 'OPENING_BALANCE', 'OP-2026', 'Stok Awal Tahun', stockLaptopMain);

    // 2. Inbound Purchase (Main)
    stockLaptopMain = await recordMovement(new Date('2026-02-01'), laptop, whMain, 'INBOUND', 20, 'INBOUND', 'GRN-2026/02/001', 'Pembelian dari PT Maju Jaya', stockLaptopMain);

    // 3. Transfer to Branch (Main -> Out, Branch -> In)
    stockLaptopMain = await recordMovement(new Date('2026-02-05'), laptop, whMain, 'ADJUSTMENT_OUT', 5, 'TRANSFER', 'TRF-001', 'Transfer ke Cabang Selatan', stockLaptopMain);
    stockLaptopBranch = await recordMovement(new Date('2026-02-05'), laptop, whBranch, 'ADJUSTMENT_IN', 5, 'TRANSFER', 'TRF-001', 'Terima dari Pusat', stockLaptopBranch);

    // 4. Broken Item Moved to Damaged (Main -> Damaged)
    stockLaptopMain = await recordMovement(new Date('2026-02-10'), laptop, whMain, 'ADJUSTMENT_OUT', 1, 'DAMAGED', 'ADJ-DMG-001', 'Layar Pecah - Pindah ke Gudang Rusak', stockLaptopMain);
    stockLaptopDamaged = await recordMovement(new Date('2026-02-10'), laptop, whDamaged, 'ADJUSTMENT_IN', 1, 'DAMAGED', 'ADJ-DMG-001', 'Terima Barang Rusak', stockLaptopDamaged);

    // 5. Usage (Outbound)
    stockLaptopMain = await recordMovement(new Date('2026-02-12'), laptop, whMain, 'OUTBOUND', 2, 'OUTBOUND', 'OUT-001', 'Pengambilan untuk Staff Baru', stockLaptopMain);


    // --- SCENARIO 2: CHAIR (High Volume) ---
    console.log('Processing Chair History...');
    let stockChairMain = 0;

    // 1. Inbound Bulk
    stockChairMain = await recordMovement(new Date('2026-02-02'), chair, whMain, 'INBOUND', 100, 'INBOUND', 'GRN-2026/02/004', 'Restock Kursi', stockChairMain);

    // 2. Sales / Project Usage
    stockChairMain = await recordMovement(new Date('2026-02-08'), chair, whMain, 'OUTBOUND', 25, 'OUTBOUND', 'OUT-PROJ-01', 'Project Ruang Meeting Lt 3', stockChairMain);

    // 3. Opname Correction (Found extra)
    stockChairMain = await recordMovement(new Date('2026-02-13'), chair, whMain, 'ADJUSTMENT_IN', 2, 'ADJUSTMENT', 'ADJ-OPNAME-01', 'Koreksi Stok Opname', stockChairMain);


    // --- SCENARIO 3: MONITOR (Simple) ---
    console.log('Processing Monitor History...');
    let stockMonitorMain = 0;

    stockMonitorMain = await recordMovement(new Date('2026-02-03'), monitor, whMain, 'INBOUND', 10, 'INBOUND', 'GRN-2026/02/003', 'Masuk Monitor LG', stockMonitorMain);
    stockMonitorMain = await recordMovement(new Date('2026-02-14'), monitor, whMain, 'OUTBOUND', 1, 'OUTBOUND', 'OUT-002', 'Replacement user', stockMonitorMain);


    // --- UPDATE WAREHOUSE STOCK SUMMARIES ---
    console.log('💾 Updating Current Stock records...');

    const updateStock = async (itemId: string, warehouseId: string, qty: number) => {
        await prisma.warehouseStock.upsert({
            where: {
                warehouseId_itemId: { warehouseId, itemId }
            },
            update: { quantity: qty },
            create: { warehouseId, itemId, quantity: qty }
        });
    };

    // Laptop
    await updateStock(laptop.id, whMain.id, stockLaptopMain);
    await updateStock(laptop.id, whBranch.id, stockLaptopBranch);
    await updateStock(laptop.id, whDamaged.id, stockLaptopDamaged);

    // Chair
    await updateStock(chair.id, whMain.id, stockChairMain);

    // Monitor
    await updateStock(monitor.id, whMain.id, stockMonitorMain);

    // Update Global Item Stock (Sum of all warehouses)
    await prisma.item.update({ where: { id: laptop.id }, data: { currentStock: stockLaptopMain + stockLaptopBranch + stockLaptopDamaged } });
    await prisma.item.update({ where: { id: chair.id }, data: { currentStock: stockChairMain } }); // Assumes 0 elsewhere
    await prisma.item.update({ where: { id: monitor.id }, data: { currentStock: stockMonitorMain } });

    console.log('🎉 Stock Data (Cards & Warehouse Balances) generated successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
