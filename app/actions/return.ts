'use server';

import { prisma } from '@/lib/prisma';
import { ReturnStatus, ReturnReason } from '@prisma/client';
import { generateCode } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

// --- Getters ---

export async function getReturns(
    page = 1,
    limit = 10,
    search = '',
    status?: ReturnStatus
) {
    try {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { returnCode: { contains: search, mode: 'insensitive' } },
                { vendor: { name: { contains: search, mode: 'insensitive' } } },
                { purchaseRequest: { prNumber: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.return.findMany({
                where,
                skip,
                take: limit,
                orderBy: { returnDate: 'desc' },
                include: {
                    vendor: { select: { name: true } },
                    purchaseRequest: { select: { prNumber: true } },
                    _count: { select: { items: true } },
                    createdBy: { select: { name: true } }
                }
            }),
            prisma.return.count({ where })
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
        console.error('Failed to fetch returns:', error);
        return { success: false, error: error.message };
    }
}

export async function getReturnById(id: string) {
    try {
        const returnData = await prisma.return.findUnique({
            where: { id },
            include: {
                vendor: true,
                purchaseRequest: true,
                items: {
                    include: {
                        item: {
                            include: {
                                uom: true
                            }
                        }
                    }
                },
                createdBy: { select: { name: true, email: true } },
                approvedBy: { select: { name: true, email: true } }
            }
        });

        if (!returnData) {
            return { success: false, error: 'Return not found' };
        }

        return { success: true, data: returnData };
    } catch (error: any) {
        console.error('Failed to fetch return detail:', error);
        return { success: false, error: error.message };
    }
}

// --- Mutations ---

interface CreateReturnItem {
    itemId: string;
    quantity: number;
    unitPrice: number;
    reason?: string;
}

interface CreateReturnData {
    userId: string;
    purchaseRequestId: string;
    vendorId: string;
    reason: ReturnReason;
    notes?: string;
    items: CreateReturnItem[];
}

export async function createReturn(data: CreateReturnData) {
    try {
        // Generate Code: RET-YYYYMMDD-XXX
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const returnCode = `RET-${dateStr}-${random}`;

        // Calculate totals for items
        const itemsWithTotal = data.items.map(item => ({
            ...item,
            totalPrice: item.quantity * item.unitPrice
        }));

        const newReturn = await prisma.return.create({
            data: {
                returnCode,
                createdById: data.userId,
                purchaseRequestId: data.purchaseRequestId,
                vendorId: data.vendorId,
                reason: data.reason,
                notes: data.notes,
                status: 'DRAFT',
                items: {
                    create: itemsWithTotal.map(item => ({
                        itemId: item.itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        reason: item.reason
                    }))
                }
            }
        });

        revalidatePath('/returns');
        return { success: true, data: newReturn };
    } catch (error: any) {
        console.error('Failed to create return:', error);
        return { success: false, error: error.message };
    }
}

export async function submitReturn(id: string) {
    try {
        const updated = await prisma.return.update({
            where: { id },
            data: { status: 'PENDING_APPROVAL' }
        });
        revalidatePath('/returns');
        revalidatePath(`/returns/${id}`);
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function approveReturn(id: string, userId: string) {
    try {
        const updated = await prisma.return.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: userId,
                approvedAt: new Date()
            }
        });
        revalidatePath('/returns');
        revalidatePath(`/returns/${id}`);
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function rejectReturn(id: string, userId: string, reason: string) {
    try {
        const updated = await prisma.return.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: userId, // Rejected by
                approvedAt: new Date(),
                approvalNotes: reason
            }
        });
        revalidatePath('/returns');
        revalidatePath(`/returns/${id}`);
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markReturnAsSent(id: string) {
    try {
        const updated = await prisma.return.update({
            where: { id },
            data: {
                status: 'SENT_TO_VENDOR',
                sentToVendorAt: new Date()
            }
        });
        revalidatePath('/returns');
        revalidatePath(`/returns/${id}`);
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function completeReturn(id: string) {
    try {
        // This is where we might update stock.
        const returnData = await prisma.return.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!returnData) throw new Error("Return not found");

        // Transaction to update status AND create stock cards
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Status
            const completedReturn = await tx.return.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date()
                }
            });

            // 2. Create Stock Cards (Deduct Stock)
            for (const item of returnData.items) {
                await tx.stockCard.create({
                    data: {
                        itemId: item.itemId,
                        movementType: 'RETURN_OUT',
                        referenceType: 'RETURN',
                        referenceId: id,
                        quantityChange: -item.quantity, // Negative for OUT
                        quantityBefore: 0,
                        quantityAfter: 0,
                        returnId: id
                    }
                });

                // 3. Decrement Item Stock
                await tx.item.update({
                    where: { id: item.itemId },
                    data: {
                        currentStock: { decrement: item.quantity }
                    }
                });
            }

            return completedReturn;
        });

        revalidatePath('/returns');
        revalidatePath(`/returns/${id}`);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Failed to complete return:', error);
        return { success: false, error: error.message };
    }
}
export async function keepReturnItems(id: string, notes?: string) {
    try {
        const returnData = await prisma.return.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!returnData) throw new Error("Return not found");

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Return Status -> COMPLETED
            const completedReturn = await tx.return.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    notes: returnData.notes ? `${returnData.notes}\nResolution: Items Kept (${notes || ''})` : `Resolution: Items Kept (${notes || ''})`
                }
            });

            // 2. Add Stock (Since we are keeping them)
            for (const item of returnData.items) {
                // Update Stock
                const updatedItem = await tx.item.update({
                    where: { id: item.itemId },
                    data: {
                        currentStock: { increment: item.quantity }
                    }
                });

                const qtyAfter = updatedItem.currentStock;
                const qtyBefore = qtyAfter - item.quantity;

                // Create Stock Card
                await tx.stockCard.create({
                    data: {
                        itemId: item.itemId,
                        movementType: 'ADJUSTMENT_IN', // Treat as Adjustment or Supplemental Inbound
                        referenceType: 'RETURN_RESOLUTION',
                        referenceId: id,
                        returnId: id,
                        quantityChange: item.quantity,
                        quantityBefore: qtyBefore,
                        quantityAfter: qtyAfter,
                        notes: `Kept Excess Items from Return ${returnData.returnCode}`
                    }
                });
            }

            return completedReturn;
        });

        revalidatePath('/returns');
        revalidatePath(`/returns/${id}`);
        revalidatePath('/inbound/issues');
        revalidatePath('/stock');

        return { success: true, data: result };
    } catch (error: any) {
        console.error('Failed to keep return items:', error);
        return { success: false, error: error.message };
    }
}
