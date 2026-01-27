'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

interface VerifyPOParams {
    prId: string;
    userId: string;
    poDocumentPath?: string;
    shippingTrackingNumber?: string;
    estimatedShippingDate?: Date;
    purchasingNotes?: string;
}

/**
 * Verify Purchase Request and create Inbound entry
 * This happens when purchasing staff accepts the PR
 */
export async function verifyPurchaseOrder(params: VerifyPOParams) {
    try {
        const {
            prId,
            userId,
            poDocumentPath,
            shippingTrackingNumber,
            estimatedShippingDate,
            purchasingNotes
        } = params;

        // 1. Get the Purchase Request with items
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId },
            include: {
                items: {
                    include: {
                        item: true
                    }
                },
                vendor: true
            }
        });

        if (!pr) {
            return {
                success: false,
                error: 'Purchase Request not found'
            };
        }

        // 2. Generate PO number if not exists
        let poNumber = pr.poNumber;
        if (!poNumber) {
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, '0');

            // Count existing POs this month
            const poCount = await prisma.purchaseRequest.count({
                where: {
                    poNumber: {
                        startsWith: `PO-${year}${month}`
                    }
                }
            });

            const sequence = String(poCount + 1).padStart(4, '0');
            poNumber = `PO-${year}${month}-${sequence}`;
        }

        // 3. Generate GRN (Goods Received Note) number
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');

        const grnCount = await prisma.inbound.count({
            where: {
                grnNumber: {
                    startsWith: `GRN-${year}${month}`
                }
            }
        });

        const grnSequence = String(grnCount + 1).padStart(4, '0');
        const grnNumber = `GRN-${year}${month}-${grnSequence}`;

        // 4. Update PR with PO details and create Inbound in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update Purchase Request
            const updatedPR = await tx.purchaseRequest.update({
                where: { id: prId },
                data: {
                    status: 'APPROVED',
                    purchasingAcceptedById: userId,
                    purchasingAcceptedAt: new Date(),
                    purchasingNotes: purchasingNotes || null,
                    poNumber,
                    poSentAt: new Date(),
                    poDocumentPath: poDocumentPath || null,
                    shippingTrackingNumber: shippingTrackingNumber || null,
                    estimatedShippingDate: estimatedShippingDate || null
                }
            });

            // Create Inbound entry
            const inbound = await tx.inbound.create({
                data: {
                    grnNumber,
                    purchaseRequestId: prId,
                    vendorId: pr.vendorId,
                    warehouseId: pr.targetWarehouseId,
                    receiveDate: estimatedShippingDate || new Date(),
                    status: 'PENDING_VERIFICATION',
                    notes: `Created from PO ${poNumber}`,
                    createdById: userId,
                    items: {
                        create: pr.items.map(item => ({
                            itemId: item.itemId,
                            expectedQuantity: item.quantity,
                            receivedQuantity: 0, // Will be updated when goods arrive
                            notes: item.notes || null
                        }))
                    }
                }
            });

            return { updatedPR, inbound };
        });

        revalidatePath('/purchase');
        revalidatePath('/inbound');

        return {
            success: true,
            data: {
                pr: serializeDecimal(result.updatedPR),
                inbound: serializeDecimal(result.inbound),
                poNumber,
                grnNumber
            }
        };
    } catch (error: any) {
        console.error('Failed to verify PO:', error);
        return {
            success: false,
            error: error.message || 'Failed to verify Purchase Order'
        };
    }
}
