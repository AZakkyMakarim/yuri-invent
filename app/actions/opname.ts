'use server';

import { prisma } from '@/lib/prisma';
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
    userId: string
) {
    try {
        // Simple Logic: Update counterA (Assuming single counter flow for now)
        // Also update finalQty and variance immediately for real-time view

        await prisma.$transaction(async (tx) => {
            const current = await tx.stockOpnameCount.findUnique({ where: { id: countId } });
            if (!current) throw new Error("Count record not found");

            await tx.stockOpnameCount.update({
                where: { id: countId },
                data: {
                    counterAId: userId,
                    counterAQty: qty,
                    counterAAt: new Date(),
                    finalQty: qty,
                    variance: qty - current.systemQty
                }
            });

            // Should we update parent status to IN_PROGRESS?
            await tx.stockOpname.update({
                where: { id: current.stockOpnameId },
                data: { status: StockOpnameStatus.COUNTING_IN_PROGRESS, startedAt: new Date() } // idempotent
            });
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update count:', error);
        return { success: false, error: error.message };
    }
}

export async function finalizeOpname(opnameId: string) {
    try {
        // 1. Lock Opname
        // 2. Create Adjustment (Optional - for now just mark completed)
        // Ideally we should create STOCK ADJUSTMENT transaction for all variances

        await prisma.stockOpname.update({
            where: { id: opnameId },
            data: {
                status: StockOpnameStatus.FINALIZED,
                completedAt: new Date()
            }
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
