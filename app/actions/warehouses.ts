'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getWarehouses() {
    try {
        const warehouses = await prisma.warehouse.findMany({
            orderBy: { isDefault: 'desc' } // Default first, then others
        });
        return { success: true, data: warehouses };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Helper to generate code: WH-001
// Helper to generate code: WH-001
async function generateWarehouseCode() {
    // Fetch all warehouse codes that start with WH-
    const warehouses = await prisma.warehouse.findMany({
        where: { code: { startsWith: 'WH-' } },
        select: { code: true }
    });

    if (warehouses.length === 0) return 'WH-001';

    let maxNum = 0;
    for (const w of warehouses) {
        const match = w.code.match(/WH-(\d+)$/); // Only match if it ends with number
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxNum) maxNum = num;
        }
    }

    // If maxNum is still 0 (only WH-MAIN existed), next is 1
    const nextNum = maxNum + 1;
    return `WH-${nextNum.toString().padStart(3, '0')}`;
}

export async function createWarehouse(data: any) {
    try {
        const code = await generateWarehouseCode(); // Auto-generate code

        const warehouse = await prisma.warehouse.create({
            data: {
                code: code,
                name: data.name,
                address: data.address,
                type: data.type || 'BRANCH',
                isDefault: data.isDefault || false,
                isActive: data.isActive ?? true
            }
        });
        revalidatePath('/master/warehouses');
        return { success: true, data: warehouse };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateWarehouse(id: string, data: any) {
    try {
        const warehouse = await prisma.warehouse.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                type: data.type,
                isActive: data.isActive
            }
        });
        revalidatePath('/master/warehouses');
        return { success: true, data: warehouse };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteWarehouse(id: string) {
    try {
        // Check if has stock?
        const hasStock = await prisma.warehouseStock.findFirst({
            where: { warehouseId: id, quantity: { gt: 0 } }
        });

        if (hasStock) {
            return { success: false, error: "Cannot delete warehouse with active stock" };
        }

        await prisma.warehouse.delete({ where: { id } });
        revalidatePath('/master/warehouses');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Warehouse Item Management
export async function getWarehouseItems(warehouseId: string) {
    try {
        const stocks = await prisma.warehouseStock.findMany({
            where: { warehouseId },
            include: {
                item: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        uom: { select: { name: true } },
                        category: { select: { name: true } }
                    }
                }
            },
            orderBy: { item: { name: 'asc' } }
        });
        return { success: true, data: stocks };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignItemsToWarehouse(warehouseId: string, itemIds: string[]) {
    try {
        await prisma.$transaction(
            itemIds.map(itemId =>
                prisma.warehouseStock.upsert({
                    where: {
                        warehouseId_itemId: { warehouseId, itemId }
                    },
                    create: {
                        warehouseId,
                        itemId,
                        quantity: 0
                    },
                    update: {} // Do nothing if exists
                })
            )
        );
        revalidatePath('/master/warehouses');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function unassignItemFromWarehouse(warehouseId: string, itemId: string) {
    try {
        const stock = await prisma.warehouseStock.findUnique({
            where: {
                warehouseId_itemId: { warehouseId, itemId }
            }
        });

        if (!stock) return { success: false, error: "Item not assigned to this warehouse" };
        if (stock.quantity > 0) return { success: false, error: "Cannot removing item with positive stock" };

        await prisma.warehouseStock.delete({
            where: {
                warehouseId_itemId: { warehouseId, itemId }
            }
        });

        revalidatePath('/master/warehouses');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


