'use server';

import prisma from '@/lib/prisma';
import { Prisma, StockOpnameStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getOpnameList(
    page = 1,
    limit = 10,
    search = ''
) {
    try {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.OR = [
                { opnameCode: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.stockOpname.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scheduledDate: 'desc' },
                include: {
                    _count: {
                        select: { counts: true }
                    }
                }
            }),
            prisma.stockOpname.count({ where })
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
        console.error('Failed to fetch opname list:', error);
        return { success: false, error: error.message };
    }
}

export async function getOpnameById(id: string) {
    try {
        const opname = await prisma.stockOpname.findUnique({
            where: { id },
            include: {
                counts: {
                    include: {
                        item: {
                            include: {
                                uom: true,
                                category: true
                            }
                        }
                    },
                    orderBy: {
                        item: { sku: 'asc' }
                    }
                }
            }
        });
        return { success: true, data: opname };
    } catch (error: any) {
        console.error('Failed to fetch opname detail:', error);
        return { success: false, error: error.message };
    }
}

export async function createOpname(data: {
    scheduledDate: Date;
    notes?: string;
    opnameCode?: string;
}) {
    try {
        // 1. Generate code if missing
        let code = data.opnameCode;
        if (!code) {
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 7).replace(/-/g, '');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            code = `OP-${dateStr}-${random}`;
        }

        // 2. Create Opname + Snapshot ALL items
        // In real app, we might filter by category. Here we do all.
        const allItems = await prisma.item.findMany({
            where: { isActive: true }
        });

        const opname = await prisma.stockOpname.create({
            data: {
                opnameCode: code,
                scheduledDate: data.scheduledDate,
                notes: data.notes,
                status: StockOpnameStatus.SCHEDULED,
                counts: {
                    create: allItems.map(item => ({
                        itemId: item.id,
                        systemQty: item.currentStock, // Snapshot!
                    }))
                }
            }
        });

        // If opname starts today/now, maybe set status to IN_PROGRESS?
        // Let's rely on user starting it explicitly or just use SCHEDULED.

        return { success: true, data: opname };
    } catch (error: any) {
        console.error('Failed to create opname:', error);
        return { success: false, error: error.message };
    }
}

export async function updateOpnameCount(
    countId: string,
    qty: number,
    userId: string,
    counterRole: 'A' | 'B' = 'A' // Default to A for backward compatibility
) {
    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.stockOpnameCount.findUnique({ where: { id: countId } });
            if (!current) throw new Error("Count record not found");

            // Prepare update data based on counter role
            const updateData: any = {
                updatedAt: new Date()
            };

            if (counterRole === 'A') {
                updateData.counterAId = userId;
                updateData.counterAQty = qty;
                updateData.counterAAt = new Date();
            } else {
                updateData.counterBId = userId;
                updateData.counterBQty = qty;
                updateData.counterBAt = new Date();
            }

            // Get the updated values
            const counterAQty = counterRole === 'A' ? qty : current.counterAQty;
            const counterBQty = counterRole === 'B' ? qty : current.counterBQty;

            // If both counters have submitted, perform comparison
            if (counterAQty !== null && counterBQty !== null) {
                const countsMatch = counterAQty === counterBQty;

                if (countsMatch) {
                    // Counts match - set final qty and calculate variance
                    updateData.isMatching = true;
                    updateData.finalQty = counterAQty; // Use Counter A's value (they're the same)
                    updateData.variance = counterAQty - current.systemQty;
                } else {
                    // Counts don't match - need recount
                    updateData.isMatching = false;
                    updateData.recountRound = current.recountRound + 1;
                    // Don't set finalQty yet
                }
            }

            // Update the count record
            await tx.stockOpnameCount.update({
                where: { id: countId },
                data: updateData
            });

            // Update parent opname status
            const opname = await tx.stockOpname.findUnique({
                where: { id: current.stockOpnameId },
                include: {
                    counts: true
                }
            });

            if (!opname) throw new Error("Opname not found");

            // Determine new status for the opname
            let newStatus = opname.status;
            const allCounts = await tx.stockOpnameCount.findMany({
                where: { stockOpnameId: current.stockOpnameId }
            });

            const allHaveCounterA = allCounts.every(c => c.counterAQty !== null);
            const allHaveCounterB = allCounts.every(c => c.counterBQty !== null);
            const allMatching = allCounts.every(c => c.isMatching);
            const anyMismatch = allCounts.some(c =>
                c.counterAQty !== null && c.counterBQty !== null && !c.isMatching
            );

            if (opname.status === 'SCHEDULED' && (counterAQty !== null || counterBQty !== null)) {
                newStatus = StockOpnameStatus.COUNTING_IN_PROGRESS;
            }

            if (allHaveCounterA && allHaveCounterB) {
                if (anyMismatch) {
                    newStatus = StockOpnameStatus.PENDING_RECOUNT;
                } else if (allMatching) {
                    newStatus = StockOpnameStatus.COUNTING_COMPLETE;
                }
            }

            await tx.stockOpname.update({
                where: { id: current.stockOpnameId },
                data: {
                    status: newStatus,
                    startedAt: opname.startedAt || new Date() // Set startedAt if not already set
                }
            });
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update count:', error);
        return { success: false, error: error.message };
    }
}


export async function finalizeOpname(opnameId: string, userId: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get Opname with Counts
            const opname = await tx.stockOpname.findUnique({
                where: { id: opnameId },
                include: { counts: true }
            });

            if (!opname) throw new Error("Opname not found");
            if (opname.status === 'FINALIZED') throw new Error("Opname already finalized");

            // 2. Identify Variances
            const varianceItems = opname.counts.filter(c => c.variance !== 0 && c.variance !== null);

            // 3. Create Stock Adjustment if there are variances
            if (varianceItems.length > 0) {
                // Generate code
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                const adjCode = `ADJ-OP-${dateStr}-${random}`;

                const adjustment = await tx.stockAdjustment.create({
                    data: {
                        adjustmentCode: adjCode,
                        adjustmentType: 'OPNAME_RESULT', // Use string literal or enum if imported
                        stockOpnameId: opnameId,
                        status: 'APPROVED', // Auto-approved? Or PENDING? Usually verified by virtue of finalizing opname. Let's say APPROVED.
                        notes: `Auto-generated from Stock Opname ${opname.opnameCode}`,
                        createdById: userId,
                        approvedById: userId, // Auto-approved by finalizer
                        approvedAt: new Date(),
                        items: {
                            create: varianceItems.map(item => ({
                                itemId: item.itemId,
                                systemQty: item.systemQty,
                                adjustedQty: item.finalQty!,
                                variance: item.variance!,
                                reason: 'Stock Opname Result'
                            }))
                        }
                    }
                });

                // 4. Update Inventory & Stock Cards (Similar to Approve Adjustment)
                for (const item of varianceItems) {
                    const movementType = item.variance! > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

                    // Update Item Stock
                    await tx.item.update({
                        where: { id: item.itemId },
                        data: { currentStock: item.finalQty! }
                    });

                    // Create Stock Card
                    await tx.stockCard.create({
                        data: {
                            itemId: item.itemId,
                            movementType: movementType as any,
                            referenceType: 'ADJUSTMENT',
                            referenceId: adjCode,
                            stockAdjustmentId: adjustment.id,
                            quantityBefore: item.systemQty,
                            quantityChange: item.variance!,
                            quantityAfter: item.finalQty!,
                            notes: `Opname ${opname.opnameCode}`
                        }
                    });
                }
            }

            // 5. Finalize Opname
            await tx.stockOpname.update({
                where: { id: opnameId },
                data: {
                    status: StockOpnameStatus.FINALIZED,
                    completedAt: new Date()
                }
            });
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to finalize opname:', error);
        return { success: false, error: error.message };
    }
}
