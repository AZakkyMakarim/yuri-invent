'use server';

import { prisma } from '@/lib/prisma';
import { OutboundStatus, OutboundType, StockMovementType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getOutboundList(
    page = 1,
    limit = 10,
    search = '',
    status?: OutboundStatus
) {
    try {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { outboundCode: { contains: search, mode: 'insensitive' } },
                        { partner: { name: { contains: search, mode: 'insensitive' } } },
                        { purpose: { contains: search, mode: 'insensitive' } },
                    ]
                }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.outbound.findMany({
                where,
                skip,
                take: limit,
                orderBy: { requestDate: 'desc' },
                include: {
                    partner: { select: { name: true } },
                    warehouse: { select: { name: true } },
                    createdBy: { select: { name: true } }, // Useful for list view
                    releasedBy: { select: { name: true } },
                    items: { select: { id: true } }, // Minimal verify count
                    _count: { select: { items: true } }
                }
            }),
            prisma.outbound.count({ where })
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
        console.error('Failed to fetch outbound listing:', error);
        return { success: false, error: error.message };
    }
}

export async function getOutboundById(id: string) {
    try {
        const outbound = await prisma.outbound.findUnique({
            where: { id },
            include: {
                partner: true,
                warehouse: true,
                createdBy: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
                approvedBy: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
                releasedBy: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
                items: {
                    include: {
                        item: {
                            include: {
                                uom: true,
                                category: true
                            }
                        }
                    }
                }
            }
        });
        if (!outbound) return { success: false, error: 'Outbound not found' };
        return { success: true, data: outbound };
    } catch (error: any) {
        console.error('Failed to fetch outbound detail:', error);
        return { success: false, error: error.message };
    }
}

export async function createOutbound(data: {
    userId: string;
    type: OutboundType;
    partnerId?: string;
    warehouseId?: string;
    purpose?: string;
    notes?: string;
    items: { itemId: string; requestedQty: number; notes?: string }[]
}) {
    try {
        if (!data.items || data.items.length === 0) {
            throw new Error("At least one item is required");
        }

        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const outboundCode = `OUT-${dateStr}-${random}`;

        const outbound = await prisma.outbound.create({
            data: {
                outboundCode,
                createdById: data.userId,
                type: data.type,
                partnerId: data.partnerId,
                warehouseId: data.warehouseId,
                purpose: data.purpose,
                notes: data.notes,
                status: OutboundStatus.DRAFT,
                items: {
                    create: data.items.map(item => ({
                        itemId: item.itemId,
                        requestedQty: item.requestedQty,
                        notes: item.notes
                    }))
                }
            }
        });

        revalidatePath('/outbound');
        return { success: true, data: outbound };
    } catch (error: any) {
        console.error('Failed to create outbound:', error);
        return { success: false, error: error.message };
    }
}

export async function approveOutbound(id: string, userId: string, notes?: string) {
    try {
        const outbound = await prisma.outbound.findUnique({ where: { id } });
        if (!outbound) throw new Error('Outbound not found');

        if (outbound.status !== OutboundStatus.DRAFT) {
            throw new Error(`Cannot approve outbound with status ${outbound.status}. Must be DRAFT.`);
        }

        await prisma.outbound.update({
            where: { id },
            data: {
                status: OutboundStatus.APPROVED,
                approvedById: userId,
                approvedAt: new Date(),
                approvalNotes: notes
            }
        });

        revalidatePath(`/outbound/${id}`);
        revalidatePath('/outbound');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to approve outbound:', error);
        return { success: false, error: error.message };
    }
}

export async function rejectOutbound(id: string, userId: string, reason: string) {
    try {
        const outbound = await prisma.outbound.findUnique({ where: { id } });
        if (!outbound) throw new Error('Outbound not found');

        // Prevent rejecting if already released (stock deducted)
        if (outbound.status === OutboundStatus.RELEASED) {
            throw new Error('Cannot reject RELEASED outbound. Stock has already been deducted.');
        }

        await prisma.outbound.update({
            where: { id },
            data: {
                status: OutboundStatus.REJECTED,
                approvedById: userId, // Rejected by acts as approver in this context or we could add rejectedBy
                approvedAt: new Date(),
                approvalNotes: reason
            }
        });

        revalidatePath(`/outbound/${id}`);
        revalidatePath('/outbound');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to reject outbound:', error);
        return { success: false, error: error.message };
    }
}

export async function releaseOutbound(data: {
    id: string;
    userId: string;
    items: { id: string; releasedQty: number }[]; // id is OutboundItemId
}) {
    try {
        const { id, userId, items } = data;

        // 1. Fetch Outbound & Check Pre-conditions
        const outbound = await prisma.outbound.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!outbound) throw new Error('Outbound not found');

        if (outbound.status !== OutboundStatus.APPROVED) {
            throw new Error(`Cannot release outbound with status ${outbound.status}. Must be APPROVED.`);
        }

        // Fetch user role to check if they are ADMIN (superadmin)
        const releaser = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });

        const isSuperAdmin = releaser?.role?.name === 'ADMIN';

        // Segregation of Duties Check (bypass for ADMIN)
        if (!isSuperAdmin && outbound.approvedById === userId) {
            throw new Error('Segregation of Duties Violation: Approver cannot be Releaser.');
        }


        // Validate Items
        if (items.length === 0) throw new Error('No items to release.');
        const totalRelease = items.reduce((sum, i) => sum + i.releasedQty, 0);
        if (totalRelease === 0) throw new Error('Total released quantity cannot be 0.');

        await prisma.$transaction(async (tx) => {
            // 2. Process Items
            for (const itemInput of items) {
                const originalItem = outbound.items.find(i => i.id === itemInput.id);
                if (!originalItem) throw new Error(`Item ${itemInput.id} not found in this outbound order.`);

                // Validate Qty
                if (itemInput.releasedQty < 0) throw new Error(`Released quantity cannot be negative.`);
                if (itemInput.releasedQty > originalItem.requestedQty) {
                    throw new Error(`Released quantity (${itemInput.releasedQty}) cannot exceed requested quantity (${originalItem.requestedQty}).`);
                }

                // Skip if 0 (partial release of other items allow 0 for some?)
                if (itemInput.releasedQty === 0) {
                    // Just update releasedQty to 0
                    await tx.outboundItem.update({
                        where: { id: itemInput.id },
                        data: { releasedQty: 0 }
                    });
                    continue;
                }

                // Check Stock
                const stockItem = await tx.item.findUnique({ where: { id: originalItem.itemId } });
                if (!stockItem) throw new Error(`Item record not found.`);

                if (stockItem.currentStock < itemInput.releasedQty) {
                    throw new Error(`Insufficient stock for ${stockItem.name}. Available: ${stockItem.currentStock}, Requested Release: ${itemInput.releasedQty}`);
                }

                // Update Stock
                const newStock = stockItem.currentStock - itemInput.releasedQty;
                await tx.item.update({
                    where: { id: stockItem.id },
                    data: { currentStock: newStock }
                });

                // Update OutboundItem
                await tx.outboundItem.update({
                    where: { id: itemInput.id },
                    data: { releasedQty: itemInput.releasedQty }
                });

                // Create Stock Card
                await tx.stockCard.create({
                    data: {
                        itemId: stockItem.id,
                        warehouseId: outbound.warehouseId,
                        movementType: StockMovementType.OUTBOUND,
                        referenceType: 'OUTBOUND',
                        referenceId: outbound.outboundCode,
                        outboundId: outbound.id,
                        quantityBefore: stockItem.currentStock,
                        quantityChange: -itemInput.releasedQty, // Negative for Outbound
                        quantityAfter: newStock,
                        notes: `Released from ${outbound.outboundCode}`
                    }
                });
            }

            // 3. Update Outbound Header
            await tx.outbound.update({
                where: { id },
                data: {
                    status: OutboundStatus.RELEASED,
                    releasedById: userId,
                    releasedAt: new Date()
                }
            });
        });

        revalidatePath(`/outbound/${id}`);
        revalidatePath('/outbound');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to release outbound:', error);
        return { success: false, error: error.message };
    }
}
