'use server';

import { prisma } from '@/lib/prisma';
import { AdjustmentType, ApprovalStatus, StockMovementType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Get list of stock adjustments with pagination and filtering
 */
export async function getStockAdjustments(
    page = 1,
    limit = 10,
    search = '',
    status?: ApprovalStatus
) {
    try {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.OR = [
                { adjustmentCode: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        const [data, total] = await Promise.all([
            prisma.stockAdjustment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: {
                        select: { name: true }
                    },
                    approvedBy: {
                        select: { name: true }
                    },
                    _count: {
                        select: { items: true }
                    }
                }
            }),
            prisma.stockAdjustment.count({ where })
        ]);

        return {
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error: any) {
        console.error('Failed to fetch adjustments:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get stock adjustment details
 */
export async function getStockAdjustmentById(id: string) {
    try {
        const adjustment = await prisma.stockAdjustment.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        item: {
                            select: {
                                sku: true,
                                name: true,
                                uom: { select: { symbol: true } }
                            }
                        }
                    }
                },
                createdBy: { select: { name: true, role: { select: { name: true } } } },
                approvedBy: { select: { name: true, role: { select: { name: true } } } }
            }
        });

        if (!adjustment) return { success: false, error: 'Adjustment not found' };

        return { success: true, data: adjustment };
    } catch (error: any) {
        console.error('Failed to fetch adjustment detail:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new stock adjustment (Draft)
 */
export async function createStockAdjustment(data: {
    userId: string;
    type: AdjustmentType;
    notes?: string;
    items: Array<{
        itemId: string;
        systemQty: number; // Snapshot of current stock
        adjustedQty: number; // The new target quantity
        reason?: string;
    }>;
}) {
    try {
        // Generate code
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `ADJ-${dateStr}-${random}`;

        // Create adjustment
        const adjustment = await prisma.stockAdjustment.create({
            data: {
                adjustmentCode: code,
                adjustmentType: data.type,
                status: ApprovalStatus.PENDING, // Directly pending for verification
                notes: data.notes,
                createdById: data.userId,
                items: {
                    create: data.items.map(item => ({
                        itemId: item.itemId,
                        systemQty: item.systemQty,
                        adjustedQty: item.adjustedQty,
                        variance: item.adjustedQty - item.systemQty,
                        reason: item.reason
                    }))
                }
            }
        });

        revalidatePath('/stock-adjustment');
        return { success: true, data: adjustment };
    } catch (error: any) {
        console.error('Failed to create adjustment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve stock adjustment
 * updates inventory and creates stock cards
 */
export async function approveStockAdjustment(id: string, userId: string, notes?: string) {
    try {
        const adjustment = await prisma.stockAdjustment.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!adjustment) return { success: false, error: 'Adjustment not found' };
        if (adjustment.status !== 'PENDING') return { success: false, error: 'Adjustment must be PENDING to approve' };

        await prisma.$transaction(async (tx: any) => {
            // 1. Update Adjustment Status
            await tx.stockAdjustment.update({
                where: { id },
                data: {
                    status: ApprovalStatus.APPROVED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    approvalNotes: notes
                }
            });

            // 2. Process each item
            for (const item of adjustment.items) {
                if (item.variance === 0) continue; // No change needed

                const movementType = item.variance > 0 ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT;
                const qtyChange = Math.abs(item.variance);

                // Fetch current stock to ensure accuracy (though we apply delta)
                const currentItem = await tx.item.findUnique({ where: { id: item.itemId } });
                if (!currentItem) throw new Error(`Item ${item.itemId} not found`);

                const quantityBefore = currentItem.currentStock;
                const quantityAfter = quantityBefore + item.variance;

                // Update Item Stock
                await tx.item.update({
                    where: { id: item.itemId },
                    data: { currentStock: quantityAfter }
                });

                // Create Stock Card
                await tx.stockCard.create({
                    data: {
                        itemId: item.itemId,
                        movementType: movementType,
                        referenceType: 'ADJUSTMENT',
                        referenceId: adjustment.adjustmentCode,
                        stockAdjustmentId: adjustment.id,
                        quantityBefore,
                        quantityChange: item.variance, // Can be negative
                        quantityAfter,
                        notes: item.reason || adjustment.notes
                    }
                });
            }
        });

        revalidatePath('/stock-adjustment');
        revalidatePath(`/stock-adjustment/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to approve adjustment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject stock adjustment
 */
export async function rejectStockAdjustment(id: string, userId: string, notes?: string) {
    try {
        await prisma.stockAdjustment.update({
            where: { id },
            data: {
                status: ApprovalStatus.REJECTED,
                approvedById: userId, // Rejected by
                approvedAt: new Date(),
                approvalNotes: notes
            }
        });

        revalidatePath('/stock-adjustment');
        revalidatePath(`/stock-adjustment/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to reject adjustment:', error);
        return { success: false, error: error.message };
    }
}
