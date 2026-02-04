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
    targetWarehouseId?: string;
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
            targetWarehouseId,
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
                    targetWarehouseId: targetWarehouseId || null,
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
    vendorId = '',
    startDate?: Date | string,
    endDate?: Date | string
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
            const vendorIds = vendorId.split(',').filter(Boolean);
            if (vendorIds.length > 0) {
                where.vendorId = { in: vendorIds };
            }
        }

        if (startDate && endDate) {
            where.requestDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        } else if (startDate) {
            where.requestDate = {
                gte: new Date(startDate)
            };
        } else if (endDate) {
            where.requestDate = {
                lte: new Date(endDate)
            };
        }

        const [data, total] = await Promise.all([
            prisma.purchaseRequest.findMany({
                where,
                skip: skip,
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
                targetWarehouse: true,
                items: {
                    include: {
                        item: {
                            include: {
                                category: true,
                                uom: true
                            }
                        }
                    }
                },
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
        const { id, userId, vendorId, rabId, targetWarehouseId, requestDate, description, status, items } = input;

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
                    targetWarehouseId: targetWarehouseId || null,
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


export async function confirmPurchaseRequest(
    prId: string,
    userId: string,
    paymentType: 'SPK' | 'NON_SPK',
    vendorId: string,
    notes?: string,
    proofDocumentPath?: string,
    verifiedItems?: Array<{ itemId: string; realPrice: number; notes?: string }>
) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId },
            include: { items: true }
        });

        if (!pr) throw new Error('PR not found');
        if (pr.status !== 'PENDING_PURCHASING_APPROVAL') {
            throw new Error(`PR is not pending purchasing approval. Current status: ${pr.status}`);
        }

        const newStatus = paymentType === 'SPK' ? 'CONFIRMED' : 'WAITING_PAYMENT';

        await prisma.$transaction(async (tx) => {
            let totalAmount = pr.totalAmount;

            // Update items with real price if provided
            if (verifiedItems && verifiedItems.length > 0) {
                let newTotal = 0;
                for (const vItem of verifiedItems) {
                    // Fix: Directly query PRItem using itemId (ItemMaster ID) and prId
                    const prItem = await tx.purchaseRequestItem.findFirst({
                        where: {
                            purchaseRequestId: prId,
                            itemId: vItem.itemId
                        }
                    });

                    if (prItem) {
                        const quantity = Number(prItem.quantity);
                        const realPrice = Number(vItem.realPrice);
                        const totalPrice = quantity * realPrice;

                        await tx.purchaseRequestItem.update({
                            where: { id: prItem.id },
                            data: {
                                unitPrice: realPrice,
                                totalPrice: totalPrice,
                                notes: vItem.notes || prItem.notes
                            }
                        });
                        newTotal += totalPrice;
                    }
                }
                // Recalculate total if items were updated
                // Use default import or cast to any to bypass strict Decimal check if simple number fails
                totalAmount = newTotal as any;
            }

            // Update PR header
            await tx.purchaseRequest.update({
                where: { id: prId },
                data: {
                    status: newStatus,
                    paymentType: paymentType,
                    vendorId: vendorId,
                    purchasingAcceptedById: userId,
                    purchasingAcceptedAt: new Date(),
                    purchasingNotes: notes,
                    totalAmount: totalAmount,
                    // Use poDocumentPath to store the proof document (SPK/Invoice)
                    poDocumentPath: proofDocumentPath
                }
            });
        });

        revalidatePath('/purchase');
        revalidatePath(`/purchase/requests/${prId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Confirm PR Error:', error);
        return { success: false, error: error.message };
    }
}

export async function releasePayment(prId: string, userId: string) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId }
        });

        if (!pr) throw new Error('PR not found');
        if (pr.status !== 'WAITING_PAYMENT') {
            throw new Error('PR is not waiting for payment');
        }

        // 1. Create a Bill (Paid) to represent the cash out
        // In a real system, this might just be a request to Finance module.
        // Here we simulate it by creating a verified Bill and Payment.
        await prisma.$transaction(async (tx) => {
            // Create Bill
            const bill = await tx.bill.create({
                data: {
                    billNumber: `BILL/${pr.prNumber.replace('PR/', '')}`, // Simple bill number gen
                    vendorId: pr.vendorId,
                    purchaseRequestId: pr.id,
                    totalAmount: pr.totalAmount,
                    remainingAmount: 0,
                    paidAmount: pr.totalAmount,
                    status: 'FULLY_PAID',
                    createdById: userId,
                }
            });

            // Create Payment record
            await tx.payment.create({
                data: {
                    paymentCode: `PAY/${Date.now()}`,
                    billId: bill.id,
                    amount: pr.totalAmount,
                    status: 'VALIDATED',
                    paymentMethod: 'CASH', // Assumption for Non-SPK default
                    createdById: userId,
                    validatedById: userId,
                    validatedAt: new Date()
                }
            });

            // Update PR Status
            await tx.purchaseRequest.update({
                where: { id: prId },
                data: { status: 'PAYMENT_RELEASED' }
            });
        });

        revalidatePath('/purchase');
        revalidatePath(`/purchase/requests/${prId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// NEW FLOW IMPLEMENTATION

export async function submitPriceVerification(
    prId: string,
    details: {
        verifiedItems: Array<{
            itemId: string;
            realPrice: number;
            notes: string;
        }>;
        poDocumentPath?: string;
        shippingTrackingNumber?: string; // Optional at this stage
        estimatedShippingDate?: Date; // Optional at this stage
        notes?: string;
    }
) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId },
            include: { items: true, vendor: true }
        });

        if (!pr) throw new Error('PR not found');

        // Allowed statuses to enter Verification
        // CONFIRMED is the state coming from Purchasing Confirmation
        if (pr.status !== 'CONFIRMED') {
            throw new Error(`Invalid PR status for verification: ${pr.status}`);
        }

        const poNumber = await generatePONumber(new Date());

        await prisma.$transaction(async (tx) => {
            // 1. Update Item Prices
            let newTotalAmount = 0;
            const verifiedMap = new Map(details.verifiedItems?.map(v => [v.itemId, v]) || []);

            for (const item of pr.items) {
                const verified = verifiedMap.get(item.itemId);
                const quantity = item.quantity;

                let priceToUse = item.unitPrice; // Fallback to original
                let notesToUse = item.notes;

                if (verified) {
                    priceToUse = new Prisma.Decimal(verified.realPrice);
                    if (verified.notes) {
                        notesToUse = item.notes ? `${item.notes}\n${verified.notes}` : verified.notes;
                    }
                }

                // Track 'verifiedUnitPrice' separately to preserve original estimate if needed, 
                // but user requirement implies "Input harga asli", so we update unitPrice or add verification field.
                // Plan said: Update items with verifiedUnitPrice.
                // Let's update `verifiedUnitPrice` AND `unitPrice` (to reflect real cost in PR).
                // Actually, let's keep `unitPrice` as "Estimated/Original" if we want to track variance?
                // The schema update added `verifiedUnitPrice`. So let's use that.

                const verifiedPriceDecimal = verified ? new Prisma.Decimal(verified.realPrice) : item.unitPrice;

                await tx.purchaseRequestItem.update({
                    where: { id: item.id },
                    data: {
                        verifiedUnitPrice: verifiedPriceDecimal,
                        // Optional: update main unitPrice too? Project usually treats unitPrice as "The Price".
                        // Let's update unitPrice too so totals match reality for Payment/PO.
                        unitPrice: verifiedPriceDecimal,
                        totalPrice: new Prisma.Decimal(Number(verifiedPriceDecimal) * quantity),
                        notes: notesToUse
                    }
                });
                newTotalAmount += (Number(verifiedPriceDecimal) * quantity);
            }

            // 2. Determine Next Status
            // SPK -> PO_GENERATED
            // Non-SPK -> WAITING_PAYMENT
            let newStatus: any = 'WAITING_PAYMENT';
            let poNumToSet = null; // Only set PO Number for SPK here? Or both?
            // "Untuk SPK... Dokumen PO nya sudah tergenerate" -> So SPK gets PO Number.
            // "Non-SPK... otomatis tergenerate dokumen PO... setelah di verifikasi (pembayaran)"
            // Actually user said: "Jika diverifikasi (Step 1) maka akan otomatis tergenerate dokumen PO yang bisa diakses... Namun setelah verifikasi (Step 1), akan ada tombol Realisasi Pembayaran... Setelah itu baru masuk ke Verifikasi Pembelian (Step 2)... kecuali untuk Dokumen PO nantinya kalau sudah di verifikasi pembelian juga bisa diakses melalui barang masuk"
            // Wait, for Non-SPK: "Jika diverifikasi (Step 1) maka akan otomatis tergenerate dokumen PO yang bisa diakses melalui Detail PR."
            // So BOTH generate PO Number at Step 1.

            newStatus = pr.paymentType === 'SPK' ? 'PO_GENERATED' : 'WAITING_PAYMENT';
            poNumToSet = poNumber;

            // 3. Update PR Header
            await tx.purchaseRequest.update({
                where: { id: prId },
                data: {
                    status: newStatus,
                    totalAmount: new Prisma.Decimal(newTotalAmount),
                    poNumber: poNumToSet,
                    poSentAt: new Date(), // Date PO generated
                    poDocumentPath: details.poDocumentPath,
                    purchasingNotes: details.notes ? (pr.purchasingNotes ? `${pr.purchasingNotes}\n${details.notes}` : details.notes) : pr.purchasingNotes
                }
            });
        });

        revalidatePath('/purchase');
        revalidatePath(`/purchase/${prId}`);
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function finalizePurchaseOrder(prId: string, userId: string) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId },
            include: { items: true }
        });

        if (!pr) throw new Error('PR not found');

        // Prerequisites:
        // SPK: Must be PO_GENERATED
        // Non-SPK: Must be PAYMENT_RELEASED
        const isSPK = pr.paymentType === 'SPK';

        if (isSPK && pr.status !== 'PO_GENERATED') {
            throw new Error('SPK PR must be in PO_GENERATED status to finalize.');
        }
        if (!isSPK && pr.status !== 'PAYMENT_RELEASED') {
            // Allow PO_GENERATED for Non-SPK if logic changes, but Plan says PAYMENT_RELEASED
            throw new Error('Non-SPK PR must be Payment Released to finalize.');
        }

        // Generate GRN Number
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const grnCount = await prisma.inbound.count({
            where: { grnNumber: { startsWith: `GRN-${year}${month}` } }
        });
        const grnNumber = `GRN-${year}${month}-${String(grnCount + 1).padStart(4, '0')}`;

        await prisma.$transaction(async (tx) => {
            // Update PR to PO_ISSUED
            await tx.purchaseRequest.update({
                where: { id: prId },
                data: { status: 'PO_ISSUED' }
            });

            // Create Inbound
            await tx.inbound.create({
                data: {
                    grnNumber,
                    purchaseRequestId: prId,
                    vendorId: pr.vendorId,
                    warehouseId: pr.targetWarehouseId,
                    receiveDate: new Date(), // Default to now, or carry over from PR if we stored it
                    status: 'PENDING_VERIFICATION',
                    notes: `Created from PO ${pr.poNumber}`,
                    createdById: userId,
                    items: {
                        create: pr.items.map(item => ({
                            itemId: item.itemId,
                            expectedQuantity: item.quantity,
                            receivedQuantity: 0,
                            notes: item.notes
                        }))
                    }
                }
            });
        });

        revalidatePath('/purchase');
        revalidatePath('/inbound');

        return { success: true };

    } catch (error: any) {
        console.error('Finalize PO Error:', error);
        return { success: false, error: error.message };
    }
}
export async function searchPurchaseRequests(query: string) {
    try {
        const res = await getPurchaseRequests(1, 20, query);
        if (res.success && Array.isArray(res.data)) {
            return res.data;
        }
        return [];
    } catch (error) {
        console.error('Failed to search PRs:', error);
        return [];
    }
}

export async function getPurchaseRequestsPendingConfirmation() {
    return getPurchaseRequests(1, 100, '', 'PENDING_PURCHASING_APPROVAL');
}
