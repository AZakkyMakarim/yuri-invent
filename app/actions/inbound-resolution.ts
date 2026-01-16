'use server';

import { prisma } from '@/lib/prisma';
import { DiscrepancyResolution } from '@/app/generated/prisma/client';
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

            await prisma.$transaction(async (tx) => {
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
                // We use 'INBOUND' type but maybe with a note about "Resolution of Excess"
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

        } else {
            // Simple Status Update for other cases (Return, Close Short, etc.)
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
