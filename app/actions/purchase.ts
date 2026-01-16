'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export type PRLineInput = {
    itemId: string;
    qty: number;
    unitPrice: number;
    notes?: string;
    fromRabLineId?: string;
};

export type CreatePRInput = {
    userId: string;
    vendorId: string;
    rabId?: string;
    requestDate: Date;
    description?: string;
    status: 'DRAFT' | 'PENDING_MANAGER_APPROVAL';
    items: PRLineInput[];
    requiresJustification?: boolean;
    justificationReason?: string;
    justificationDocument?: string;
};

export type UpdatePRInput = CreatePRInput & { id: string };

/**
 * Generate sequential PR Number: PR/YYYY/MM/XXXX
 */
async function generatePRNumber(date: Date): Promise<string> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const prefix = `PR/${year}/${monthStr}`;

    const lastPR = await prisma.purchaseRequest.findFirst({
        where: {
            prNumber: { startsWith: prefix }
        },
        orderBy: { prNumber: 'desc' }
    });

    let seq = 1;
    if (lastPR) {
        const parts = lastPR.prNumber.split('/');
        const lastSeq = parseInt(parts[3]);
        if (!isNaN(lastSeq)) {
            seq = lastSeq + 1;
        }
    }

    return `${prefix}/${seq.toString().padStart(4, '0')}`;
}

export async function createPurchaseRequest(input: CreatePRInput) {
    try {
        const {
            userId,
            vendorId,
            rabId,
            requestDate,
            description,
            status,
            items,
            requiresJustification,
            justificationReason,
            justificationDocument
        } = input;

        if (!items || items.length === 0) {
            throw new Error('Items are required');
        }

        const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

        const pr = await prisma.$transaction(async (tx) => {
            const prNumber = await generatePRNumber(requestDate);

            // Create PR
            const newPR = await tx.purchaseRequest.create({
                data: {
                    prNumber,
                    requestDate,
                    notes: description,
                    status: status as any,
                    totalAmount: new Prisma.Decimal(totalAmount),
                    vendorId,
                    rabId: rabId || null,
                    createdById: userId,
                    requiresJustification: requiresJustification || false,
                    justificationReason: justificationReason || null,
                    justificationDocument: justificationDocument || null,
                    items: {
                        create: items.map(item => ({
                            itemId: item.itemId,
                            quantity: item.qty,
                            unitPrice: new Prisma.Decimal(item.unitPrice),
                            totalPrice: new Prisma.Decimal(item.qty * item.unitPrice),
                            notes: item.notes
                        }))
                    }
                }
            });

            return newPR;
        });

        revalidatePath('/purchase');
        revalidatePath('/purchase/input');

        return { success: true, data: serializeDecimal(pr) };

    } catch (error: any) {
        console.error('Failed to create PR:', error);
        return { success: false, error: error.message || 'Failed to create PR' };
    }
}

export async function getPurchaseRequests(
    page = 1,
    limit = 10,
    search = '',
    status = '', // Comma separated
    vendorId = ''
) {
    try {
        const skip = (page - 1) * limit;
        const where: Prisma.PurchaseRequestWhereInput = {};

        if (search) {
            where.OR = [
                { prNumber: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status) {
            const statuses = status.split(',').filter(Boolean);
            if (statuses.length > 0) {
                where.status = { in: statuses as any };
            }
        }

        if (vendorId) {
            where.vendorId = vendorId;
        }

        const [data, total] = await Promise.all([
            prisma.purchaseRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    vendor: true,
                    createdBy: { select: { name: true } },
                    items: {
                        include: {
                            item: true
                        }
                    }
                }
            }),
            prisma.purchaseRequest.count({ where })
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
        console.error('Failed to fetch PRs:', error);
        return { success: false, error: error.message };
    }
}

export async function getPurchaseRequestById(id: string) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id },
            include: {
                vendor: { include: { suppliedItems: { include: { item: true } } } },
                rab: true,
                items: { include: { item: true } },
                createdBy: { select: { name: true } },
                managerApprovedBy: { select: { name: true } },
                purchasingAcceptedBy: { select: { name: true } }
            }
        });

        if (!pr) return { success: false, error: 'PR not found' };

        return { success: true, data: serializeDecimal(pr) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePurchaseRequest(input: UpdatePRInput) {
    try {
        const { id, userId, vendorId, rabId, requestDate, description, status, items } = input;

        // Check ownership/status
        const existingPR = await prisma.purchaseRequest.findUnique({
            where: { id },
            select: { status: true }
        });

        if (!existingPR) throw new Error('PR not found');
        if (existingPR.status !== 'DRAFT' && existingPR.status !== 'REJECTED') {
            throw new Error('Only Draft or Rejected PRs can be modified');
        }

        const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

        const updatedPR = await prisma.$transaction(async (tx) => {
            // Delete existing lines
            await tx.purchaseRequestItem.deleteMany({
                where: { purchaseRequestId: id }
            });

            // Update PR header and create new lines
            const pr = await tx.purchaseRequest.update({
                where: { id },
                data: {
                    requestDate,
                    notes: description,
                    status: status as any, // If submitting, status changes to PENDING_MANAGER_APPROVAL
                    totalAmount: new Prisma.Decimal(totalAmount),
                    vendorId,
                    rabId: rabId || null,
                    updatedAt: new Date(),
                    items: {
                        create: items.map(item => ({
                            itemId: item.itemId,
                            quantity: item.qty,
                            unitPrice: new Prisma.Decimal(item.unitPrice),
                            totalPrice: new Prisma.Decimal(item.qty * item.unitPrice),
                            notes: item.notes
                        }))
                    }
                }
            });
            return pr;
        });

        revalidatePath('/purchase');
        revalidatePath(`/purchase/${id}`);

        return { success: true, data: serializeDecimal(updatedPR) };

    } catch (error: any) {
        console.error('Failed to update PR:', error);
        return { success: false, error: error.message };
    }
}

export async function deletePurchaseRequest(id: string) {
    try {
        const existingPR = await prisma.purchaseRequest.findUnique({
            where: { id },
            select: { status: true }
        });

        if (!existingPR) throw new Error('PR not found');
        if (existingPR.status !== 'DRAFT' && existingPR.status !== 'REJECTED') {
            throw new Error('Only Draft or Rejected PRs can be deleted');
        }

        await prisma.purchaseRequest.delete({ where: { id } });
        revalidatePath('/purchase');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function verifyPurchaseRequest(
    prId: string,
    action: 'APPROVE' | 'REJECT',
    userId: string,
    notes?: string
) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId }
        });

        if (!pr) throw new Error('PR not found');
        if (pr.status !== 'PENDING_MANAGER_APPROVAL') {
            throw new Error('PR is not pending manager approval');
        }

        const newState = action === 'APPROVE' ? 'PENDING_PURCHASING_APPROVAL' : 'REJECTED';

        await prisma.purchaseRequest.update({
            where: { id: prId },
            data: {
                status: newState,
                managerApprovalStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                managerApprovedById: userId,
                managerApprovedAt: new Date(),
                managerNotes: notes
            }
        });

        revalidatePath('/purchase');
        revalidatePath('/purchase/manager-verification');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function generatePONumber(date: Date): Promise<string> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const prefix = `PO/${year}/${monthStr}`;

    const lastPO = await prisma.purchaseRequest.findFirst({
        where: {
            poNumber: { startsWith: prefix }
        },
        orderBy: { poNumber: 'desc' }
    });

    let seq = 1;
    if (lastPO && lastPO.poNumber) {
        const parts = lastPO.poNumber.split('/');
        const lastSeq = parseInt(parts[3]);
        if (!isNaN(lastSeq)) {
            seq = lastSeq + 1;
        }
    }

    return `${prefix}/${seq.toString().padStart(4, '0')}`;
}

export async function acceptPurchaseRequest(
    prId: string,
    userId: string
) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId }
        });

        if (!pr) throw new Error('PR not found');
        if (pr.status !== 'PENDING_PURCHASING_APPROVAL') {
            throw new Error('PR is not pending purchasing approval');
        }

        const poNumber = await generatePONumber(new Date());

        await prisma.purchaseRequest.update({
            where: { id: prId },
            data: {
                status: 'APPROVED',
                poNumber,
                purchasingAcceptedById: userId,
                purchasingAcceptedAt: new Date()
            }
        });

        revalidatePath('/purchase');
        revalidatePath('/purchase/purchasing-verification');

        return { success: true, data: { poNumber } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
