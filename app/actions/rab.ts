'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export type RABLineInput = {
    itemId: string;
    requiredQty: number;
    notes?: string;
};

export type CreateRABInput = {
    fiscalYear: number;
    fiscalMonth: number;
    currency: string;
    items: RABLineInput[];
    userId: string;
};

// --- Helper Functions ---

/**
 * Calculates the highest unit price for an item across all vendors.
 * Used to estimate the budget cost conservatively.
 */
export async function getHighestVendorPrice(itemId: string): Promise<number> {
    const vendorItems = await prisma.vendorItem.findMany({
        where: { itemId, isActive: true },
        select: { cogsPerUom: true },
    });

    if (vendorItems.length === 0) return 0;

    // Find the maximum price
    const maxPrice = Math.max(...vendorItems.map((vi) => vi.cogsPerUom));
    return maxPrice;
}

/**
 * Calculates stats for a RAB Line:
 * - Last Stock (snapshot)
 * - Replenish Qty (Required - Last Stock)
 * - Unit Price (Highest Vendor Price)
 * - Total Amount (Replenish * Price)
 */
export async function calculateRABLineStats(itemId: string, requiredQty: number) {
    const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { currentStock: true },
    });

    if (!item) throw new Error(`Item not found: ${itemId}`);

    const lastStockSnapshot = item.currentStock;
    const replenishQty = Math.max(0, requiredQty - lastStockSnapshot); // Cannot be negative
    const unitPrice = await getHighestVendorPrice(itemId);
    const totalAmount = replenishQty * unitPrice;

    return {
        lastStockSnapshot,
        replenishQty,
        unitPrice,
        totalAmount,
    };
}

// --- Server Actions ---

export async function createRAB(data: CreateRABInput) {
    const { fiscalYear, fiscalMonth, currency, items, userId } = data;

    // 0. Validate Uniqueness
    const existingRAB = await prisma.rAB.findUnique({
        where: {
            fiscalYear_fiscalMonth: {
                fiscalYear,
                fiscalMonth,
            },
        },
    });

    if (existingRAB) {
        return { success: false, error: `RAB for ${fiscalMonth}/${fiscalYear} already exists.` };
    }

    try {
        // 1. Prepare Line Data with Calculations
        let grandTotal = 0;
        const lineData: Prisma.RABLineCreateManyRabInput[] = [];

        for (const line of items) {
            const stats = await calculateRABLineStats(line.itemId, line.requiredQty);

            lineData.push({
                itemId: line.itemId,
                requiredQty: line.requiredQty,
                notes: line.notes,
                lastStockSnapshot: stats.lastStockSnapshot, // Snapshot
                replenishQty: stats.replenishQty,
                unitPrice: new Prisma.Decimal(stats.unitPrice),
                totalAmount: new Prisma.Decimal(stats.totalAmount),
                usedAmount: new Prisma.Decimal(0)
            });

            grandTotal += stats.totalAmount;
        }

        // 2. Create Transaction
        const rab = await prisma.rAB.create({
            data: {
                code: `RAB-${fiscalYear}-${fiscalMonth.toString().padStart(2, '0')}`, // Simple auto-code
                name: `Budget Plan ${fiscalMonth}/${fiscalYear}`,
                fiscalYear,
                fiscalMonth,
                currency,
                totalBudget: new Prisma.Decimal(grandTotal),
                remainingBudget: new Prisma.Decimal(grandTotal),
                usedBudget: new Prisma.Decimal(0),
                status: 'DRAFT',
                createdById: userId,
                rabLines: {
                    createMany: {
                        data: lineData,
                    },
                },
            },
        });

        revalidatePath('/budget');

        // Serialize Decimal fields for client component compatibility
        const serializedRab = {
            ...rab,
            totalBudget: rab.totalBudget.toNumber(),
            usedBudget: rab.usedBudget.toNumber(),
            remainingBudget: rab.remainingBudget.toNumber(),
        };

        return { success: true, data: serializedRab };

    } catch (error: any) {
        console.error('Failed to create RAB:', error);
        return { success: false, error: error.message || 'Failed to create RAB' };
    }
}

export async function getAllItems() {
    try {
        const items = await prisma.item.findMany({
            where: { isActive: true },
            select: {
                id: true,
                sku: true,
                name: true,
                uom: { select: { symbol: true } }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: items };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getRABList() {
    try {
        const rabs = await prisma.rAB.findMany({
            include: {
                createdBy: { select: { name: true } },
                _count: { select: { rabLines: true } }
            },
            orderBy: [{ fiscalYear: 'desc' }, { fiscalMonth: 'desc' }]
        });

        // Serialize Decimal fields to numbers for client component compatibility
        const serializedRabs = rabs.map(rab => ({
            ...rab,
            totalBudget: rab.totalBudget.toNumber(),
            usedBudget: rab.usedBudget.toNumber(),
            remainingBudget: rab.remainingBudget.toNumber(),
        }));

        return { success: true, data: serializedRabs };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getRABDetails(id: string) {
    try {
        const rab = await prisma.rAB.findUnique({
            where: { id },
            include: {
                createdBy: { select: { name: true } },
                approvedBy: { select: { name: true } },
                rabLines: {
                    include: {
                        item: {
                            select: {
                                sku: true,
                                name: true,
                                uom: { select: { symbol: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!rab) return { success: false, error: "RAB not found" };

        // Serialize Decimal fields to numbers for client component compatibility
        const serializedRab = {
            ...rab,
            totalBudget: rab.totalBudget.toNumber(),
            usedBudget: rab.usedBudget.toNumber(),
            remainingBudget: rab.remainingBudget.toNumber(),
            rabLines: rab.rabLines.map(line => ({
                ...line,
                unitPrice: line.unitPrice.toNumber(),
                totalAmount: line.totalAmount.toNumber(),
                usedAmount: line.usedAmount.toNumber(),
            }))
        };

        return { success: true, data: serializedRab };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteRAB(id: string) {
    try {
        await prisma.rAB.delete({ where: { id } });
        revalidatePath('/budget');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function approveRAB(id: string, userId: string) {
    try {
        await prisma.rAB.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: userId,
                approvedAt: new Date()
            }
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function rejectRAB(id: string) {
    try {
        await prisma.rAB.update({
            where: { id },
            data: {
                status: 'REJECTED'
            }
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
