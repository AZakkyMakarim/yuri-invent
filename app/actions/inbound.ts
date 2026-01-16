'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import {
    Prisma,
    StockMovementType,
    InboundStatus,
    InboundDiscrepancyType,
    DiscrepancyResolution
} from '@/app/generated/prisma/client';

export type InboundVerificationItem = {
    itemId: string;
    expectedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    notes?: string;
    discrepancyType?: InboundDiscrepancyType;
    discrepancyAction?: DiscrepancyResolution;
    discrepancyReason?: string;
};

export type VerifyInboundInput = {
    id: string;
    userId: string;
    proofDocumentPath: string;
    verificationNotes?: string;
    items: InboundVerificationItem[];
};

export type ActionResponse = {
    success: boolean;
    error?: string;
    data?: any;
    pagination?: any;
};

export async function getInbounds(
    page = 1,
    limit = 10,
    search = '',
    status = ''
): Promise<ActionResponse> {
    try {
        const skip = (page - 1) * limit;
        const where: Prisma.InboundWhereInput = {};

        if (search) {
            where.OR = [
                { grnNumber: { contains: search, mode: 'insensitive' } },
                {
                    purchaseRequest: {
                        prNumber: { contains: search, mode: 'insensitive' }
                    }
                },
                {
                    vendor: {
                        name: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }

        if (status) {
            const statuses = status.split(',').filter(Boolean);
            if (statuses.length > 0) {
                where.status = { in: statuses as any };
            }
        }

        const [data, total] = await Promise.all([
            prisma.inbound.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    vendor: true,
                    purchaseRequest: {
                        select: {
                            prNumber: true,
                            poNumber: true
                        }
                    },
                    createdBy: { select: { name: true } },
                    verifiedBy: { select: { name: true } },
                    _count: {
                        select: { items: true }
                    }
                }
            }),
            prisma.inbound.count({ where })
        ]);

        return {
            success: true,
            data: serializeDecimal(data),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error: any) {
        console.error('Failed to fetch inbounds:', error);
        return { success: false, error: error.message };
    }
}

export async function getInboundById(id: string): Promise<ActionResponse> {
    try {
        const inbound = await prisma.inbound.findUnique({
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
                createdBy: { select: { name: true } },
                verifiedBy: { select: { name: true } }
            }
        });

        if (!inbound) return { success: false, error: 'Inbound not found' };

        return { success: true, data: serializeDecimal(inbound) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function verifyInbound(input: VerifyInboundInput): Promise<ActionResponse> {
    try {
        const { id, userId, proofDocumentPath, verificationNotes, items } = input;

        // Verify Inbound exists and is pending
        const existingInbound = await prisma.inbound.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!existingInbound) throw new Error('Inbound not found');
        if (existingInbound.status !== 'PENDING_VERIFICATION') {
            throw new Error('Inbound is not pending verification');
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Inbound Status
            const verifiedInbound = await tx.inbound.update({
                where: { id },
                data: {
                    status: 'VERIFIED',
                    verifiedById: userId,
                    verifiedAt: new Date(),
                    verificationNotes,
                    proofDocumentUrl: proofDocumentPath,
                    updatedAt: new Date()
                }
            });

            // 2. Process Items
            for (const itemInput of items) {
                const inboundItem = existingInbound.items.find(i => i.itemId === itemInput.itemId);

                if (inboundItem) {
                    // Update Inbound Item with detailed Verification Data
                    await tx.inboundItem.update({
                        where: { id: inboundItem.id },
                        data: {
                            receivedQuantity: itemInput.receivedQty,
                            acceptedQuantity: itemInput.acceptedQty,
                            rejectedQuantity: itemInput.rejectedQty,
                            notes: itemInput.notes,
                            discrepancyType: itemInput.discrepancyType || 'NONE',
                            discrepancyAction: itemInput.discrepancyAction || (itemInput.discrepancyType && itemInput.discrepancyType !== 'NONE' ? 'PENDING' : null),
                            discrepancyReason: itemInput.discrepancyReason
                        }
                    });

                    // 3. Update Stock (Only for ACCEPTED Quantity)
                    if (itemInput.acceptedQty > 0) {
                        // Update stock atomically and get new value
                        const updatedItem = await tx.item.update({
                            where: { id: itemInput.itemId },
                            data: {
                                currentStock: {
                                    increment: itemInput.acceptedQty
                                }
                            }
                        });

                        const qtyAfter = updatedItem.currentStock;
                        const qtyBefore = qtyAfter - itemInput.acceptedQty;

                        // Create Stock Card
                        await tx.stockCard.create({
                            data: {
                                itemId: itemInput.itemId,
                                movementType: 'INBOUND',
                                referenceType: 'INBOUND',
                                referenceId: id,
                                inboundId: id,
                                quantityBefore: qtyBefore,
                                quantityChange: itemInput.acceptedQty,
                                quantityAfter: qtyAfter,
                                notes: `Inbound ${verifiedInbound.grnNumber}: Accepted ${itemInput.acceptedQty} / Received ${itemInput.receivedQty}`,
                                transactionDate: new Date()
                            }
                        });
                    }
                }
            }

            return verifiedInbound;
        });

        revalidatePath('/inbound');
        revalidatePath('/inbound/verification');
        revalidatePath('/stock');

        return { success: true };

    } catch (error: any) {
        console.error('Failed to verify inbound:', error);
        return { success: false, error: error.message };
    }
}

export async function getInboundIssues(
    page = 1,
    limit = 10,
    search = ''
): Promise<ActionResponse> {
    try {
        const skip = (page - 1) * limit;
        const where: Prisma.InboundItemWhereInput = {
            discrepancyType: { not: 'NONE' }
        };

        if (search) {
            where.OR = [
                { inbound: { grnNumber: { contains: search, mode: 'insensitive' } } },
                { item: { name: { contains: search, mode: 'insensitive' } } },
                { item: { sku: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.inboundItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { inbound: { receiveDate: 'desc' } },
                include: {
                    inbound: {
                        select: {
                            grnNumber: true,
                            vendor: { select: { name: true } },
                            receiveDate: true
                        }
                    },
                    item: {
                        select: {
                            sku: true,
                            name: true,
                            uom: { select: { name: true } }
                        }
                    }
                }
            }),
            prisma.inboundItem.count({ where })
        ]);

        return {
            success: true,
            data: serializeDecimal(data),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error: any) {
        console.error('Failed to fetch inbound issues:', error);
        return { success: false, error: error.message };
    }
}
