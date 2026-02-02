'use server';

import { prisma } from '@/lib/prisma';
import { InboundDiscrepancyType, DiscrepancyResolution, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function resolveInboundDiscrepancy(
    inboundItemId: string,
    userId: string,
    action: DiscrepancyResolution,
    notes?: string
) {
    try {
        const item = await prisma.inboundItem.findUnique({
            where: { id: inboundItemId },
            include: { inbound: true }
        });

        if (!item) throw new Error('Item not found');

        // Logic for KEEP_EXCESS
        // If we keep excess, we are effectively converting "Rejected/Overage" quantity into "Accepted" quantity.
        // In our verification logic, any non-accepted quantity was put into "rejectedQuantity".
        if (action === 'KEEP_EXCESS' && item.rejectedQuantity > 0) {
            const qtyToAdd = item.rejectedQuantity;

            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // 1. Move qty from Rejected to Accepted
                await tx.inboundItem.update({
                    where: { id: inboundItemId },
                    data: {
                        acceptedQuantity: { increment: qtyToAdd },
                        rejectedQuantity: 0, // All rejected is now accepted
                        discrepancyAction: action,
                        notes: item.notes ? `${item.notes}\nResolution: ${notes}` : `Resolution: ${notes}`
                    }
                });

                // 2. Add to Stock
                await tx.item.update({
                    where: { id: item.itemId },
                    data: { currentStock: { increment: qtyToAdd } }
                });

                // 3. Create Stock Card (Adjustment/Inbound)
                const lastCard = await tx.stockCard.findFirst({
                    where: { itemId: item.itemId },
                    orderBy: { createdAt: 'desc' },
                });

                const currentStock = (lastCard?.quantityAfter || 0);

                await tx.stockCard.create({
                    data: {
                        itemId: item.itemId,
                        movementType: 'INBOUND',
                        referenceType: 'INBOUND',
                        referenceId: item.inboundId,
                        inboundId: item.inboundId, // Relation
                        transactionDate: new Date(),
                        quantityChange: qtyToAdd,
                        quantityBefore: currentStock,
                        quantityAfter: currentStock + qtyToAdd,
                        notes: `Resolution: Keep Excess (${notes || ''})`
                    }
                });
            });

        } else if (['RETURN_TO_VENDOR', 'REPLACE_ITEM', 'REFUND'].includes(action)) {
            // These actions usually involve Creating a Return Document
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // 1. Update Status
                await tx.inboundItem.update({
                    where: { id: inboundItemId },
                    data: {
                        discrepancyAction: action,
                        notes: item.notes ? `${item.notes}\nResolution: ${notes}` : `Resolution: ${notes}`
                    }
                });

                // 2. Create Return Document
                const year = new Date().getFullYear();
                const month = String(new Date().getMonth() + 1).padStart(2, '0');
                const returnCount = await tx.return.count({
                    where: { returnCode: { startsWith: `RET/${year}/${month}` } }
                });
                const returnCode = `RET/${year}/${month}/${String(returnCount + 1).padStart(4, '0')}`;

                await tx.return.create({
                    data: {
                        returnCode,
                        purchaseRequestId: item.inbound.purchaseRequestId,
                        inboundId: item.inboundId,
                        vendorId: item.inbound.vendorId,
                        returnDate: new Date(),
                        reason: action === 'REFUND' ? 'OTHER' : (action === 'REPLACE_ITEM' ? 'WRONG_ITEM' : 'OTHER'), // Adjust generic reason
                        status: 'DRAFT',
                        notes: `Generated from Resolution: ${action}. ${notes || ''}`,
                        createdById: userId,
                        items: {
                            create: {
                                itemId: item.itemId,
                                quantity: item.rejectedQuantity > 0 ? item.rejectedQuantity : (item.receivedQuantity - item.expectedQuantity), // Use rejected OR excess
                                unitPrice: new Prisma.Decimal(0),
                                totalPrice: new Prisma.Decimal(0),
                                reason: `${item.discrepancyType}: ${item.discrepancyReason || ''}`
                            }
                        }
                    }
                });

                // 3. IF REPLACE_ITEM -> Create New Child Inbound (Exchanging good for bad)
                if (action === 'REPLACE_ITEM') {
                    // Check if parent inbound exists to chain? Or just use current inbound as parent?
                    // Usually we use the current inbound as parent for traceability.

                    // Child Inbound Suffix
                    const childCount = await tx.inbound.count({ where: { parentInboundId: item.inboundId } });
                    const suffix = String.fromCharCode(65 + childCount); // A, B, C... (Might conflict if used for shortage too, but ok for MVP)
                    const childGrnNumber = `${item.inbound.grnNumber}-REP-${suffix}`; // Distinction for Replacement

                    await tx.inbound.create({
                        data: {
                            grnNumber: childGrnNumber,
                            purchaseRequestId: item.inbound.purchaseRequestId,
                            vendorId: item.inbound.vendorId,
                            parentInboundId: item.inboundId,
                            receiveDate: new Date(),
                            status: 'PENDING_VERIFICATION',
                            notes: `Replacement for ${item.inbound.grnNumber} (${item.discrepancyType}). ${notes || ''}`,
                            createdById: userId,
                            items: {
                                create: {
                                    itemId: item.itemId,
                                    expectedQuantity: item.rejectedQuantity, // We expect the replacement for what we rejected
                                    receivedQuantity: 0
                                }
                            }
                        }
                    });
                }
            });

        } else {
            // Simple Status Update for other cases (Wait Remaining, Close Short - handled by closeShortage but maybe passed here?)
            // WAIT_REMAINING just updates status/notes essentially.
            await prisma.inboundItem.update({
                where: { id: inboundItemId },
                data: {
                    discrepancyAction: action,
                    notes: item.notes ? `${item.notes}\nResolution: ${notes}` : `Resolution: ${notes}`
                }
            });
        }

        revalidatePath('/inbound/issues');
        return { success: true };

    } catch (error: any) {
        console.error('Failed to resolve discrepancy:', error);
        return { success: false, error: error.message };
    }
}
