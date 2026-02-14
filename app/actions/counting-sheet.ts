'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Generate a new blank counting sheet for an opname
 */
export async function generateCountingSheet(opnameId: string) {
    try {
        // Get current max sheet number for this opname
        const maxSheet = await prisma.countingSheet.aggregate({
            where: { stockOpnameId: opnameId },
            _max: { sheetNumber: true }
        });

        const nextSheetNumber = (maxSheet._max.sheetNumber || 0) + 1;

        // Get all items for this opname
        const opname = await prisma.stockOpname.findUnique({
            where: { id: opnameId },
            include: {
                counts: {
                    select: { itemId: true }
                }
            }
        });

        if (!opname) {
            return { success: false, error: 'Stock opname not found' };
        }

        // Create counting sheet with items
        const sheet = await prisma.countingSheet.create({
            data: {
                stockOpnameId: opnameId,
                sheetNumber: nextSheetNumber,
                status: 'DRAFT',
                items: {
                    create: opname.counts.map((count: any) => ({
                        itemId: count.itemId
                    }))
                }
            },
            include: {
                items: {
                    include: {
                        item: {
                            include: {
                                category: true,
                                uom: true
                            }
                        }
                    }
                }
            }
        });

        revalidatePath(`/opname/${opnameId}`);
        return { success: true, data: sheet };
    } catch (error) {
        console.error('Failed to generate counting sheet:', error);
        return { success: false, error: 'Failed to generate counting sheet' };
    }
}

/**
 * Get all counting sheets for an opname
 */
export async function getCountingSheets(opnameId: string) {
    try {
        const sheets = await prisma.countingSheet.findMany({
            where: { stockOpnameId: opnameId },
            include: {
                items: {
                    select: {
                        countedQty: true
                    }
                }
            },
            orderBy: { sheetNumber: 'asc' }
        });

        // Calculate items counted for each sheet
        const sheetsWithProgress = sheets.map((sheet: any) => ({
            ...sheet,
            itemsCounted: sheet.items.filter((item: any) => item.countedQty !== null).length,
            totalItems: sheet.items.length
        }));

        return { success: true, data: sheetsWithProgress };
    } catch (error) {
        console.error('Failed to get counting sheets:', error);
        return { success: false, error: 'Failed to get counting sheets' };
    }
}

/**
 * Get single counting sheet with all items
 */
export async function getCountingSheetById(sheetId: string) {
    try {
        const sheet = await prisma.countingSheet.findUnique({
            where: { id: sheetId },
            include: {
                stockOpname: {
                    select: {
                        opnameCode: true,
                        status: true,
                        scheduledDate: true
                    }
                },
                items: {
                    include: {
                        item: {
                            include: {
                                category: true,
                                uom: true
                            }
                        }
                    },
                    orderBy: {
                        item: {
                            sku: 'asc'
                        }
                    }
                }
            }
        });

        if (!sheet) {
            return { success: false, error: 'Counting sheet not found' };
        }

        return { success: true, data: sheet };
    } catch (error) {
        console.error('Failed to get counting sheet:', error);
        return { success: false, error: 'Failed to get counting sheet' };
    }
}

/**
 * Update count for a specific item in a sheet
 */
export async function updateSheetItemCount(
    sheetItemId: string,
    countedQty: number | null,
    notes?: string
) {
    try {
        const sheetItem = await prisma.countingSheetItem.update({
            where: { id: sheetItemId },
            data: {
                countedQty,
                notes: notes || null
            }
        });

        // Update sheet status to COUNTING if it was DRAFT
        await prisma.countingSheet.updateMany({
            where: {
                id: sheetItem.countingSheetId,
                status: 'DRAFT'
            },
            data: {
                status: 'COUNTING'
            }
        });

        return { success: true, data: sheetItem };
    } catch (error) {
        console.error('Failed to update sheet item count:', error);
        return { success: false, error: 'Failed to update count' };
    }
}

/**
 * Batch update all counts in a sheet
 */
export async function batchUpdateSheetCounts(
    sheetId: string,
    counts: Record<string, number | null>,
    notes: Record<string, string>
) {
    try {
        console.log('DEBUG BATCH UPDATE:', { sheetId, counts, notes });
        const updates = Object.entries(counts).map(([itemId, qty]) =>
            prisma.countingSheetItem.updateMany({
                where: {
                    countingSheetId: sheetId,
                    id: itemId
                },
                data: {
                    countedQty: qty,
                    notes: notes[itemId] || null
                }
            })
        );

        await prisma.$transaction(updates);

        // Update sheet status to COUNTING if it was DRAFT
        await prisma.countingSheet.updateMany({
            where: {
                id: sheetId,
                status: 'DRAFT'
            },
            data: {
                status: 'COUNTING'
            }
        });

        revalidatePath(`/opname`);
        return { success: true };
    } catch (error) {
        console.error('Failed to batch update counts:', error);
        return { success: false, error: 'Failed to update counts' };
    }
}

/**
 * Submit counting sheet
 */
export async function submitCountingSheet(
    sheetId: string,
    counterName: string,
    counterRole?: string
) {
    try {
        // Check if all items have been counted
        const sheet = await prisma.countingSheet.findUnique({
            where: { id: sheetId },
            include: {
                items: {
                    select: { countedQty: true }
                }
            }
        });

        if (!sheet) {
            return { success: false, error: 'Counting sheet not found' };
        }

        const uncountedItems = sheet.items.filter((item: any) => item.countedQty === null).length;
        if (uncountedItems > 0) {
            return {
                success: false,
                error: `${uncountedItems} items still need to be counted`
            };
        }

        // Update sheet
        const updatedSheet = await prisma.countingSheet.update({
            where: { id: sheetId },
            data: {
                status: 'SUBMITTED',
                counterName,
                counterRole: counterRole || null,
                submittedAt: new Date()
            }
        });

        revalidatePath(`/opname/${sheet.stockOpnameId}`);
        return { success: true, data: updatedSheet };
    } catch (error) {
        console.error('Failed to submit counting sheet:', error);
        return { success: false, error: 'Failed to submit counting sheet' };
    }
}

/**
 * Compare two counting sheets
 */
export async function compareSheets(sheet1Id: string, sheet2Id: string) {
    try {
        const [sheet1, sheet2] = await Promise.all([
            prisma.countingSheet.findUnique({
                where: { id: sheet1Id },
                include: {
                    items: {
                        include: {
                            item: {
                                select: { sku: true, name: true }
                            }
                        }
                    }
                }
            }),
            prisma.countingSheet.findUnique({
                where: { id: sheet2Id },
                include: {
                    items: {
                        include: {
                            item: {
                                select: { sku: true, name: true }
                            }
                        }
                    }
                }
            })
        ]);

        if (!sheet1 || !sheet2) {
            return { success: false, error: 'One or both sheets not found' };
        }

        // Compare items
        const comparison = sheet1.items.map((item1: any) => {
            const item2 = sheet2.items.find((i: any) => i.itemId === item1.itemId);
            const isMatching = item1.countedQty === item2?.countedQty;

            return {
                itemId: item1.itemId,
                sku: item1.item.sku,
                name: item1.item.name,
                sheet1Qty: item1.countedQty,
                sheet2Qty: item2?.countedQty || null,
                isMatching,
                difference: item1.countedQty! - (item2?.countedQty || 0)
            };
        });

        const matchedItems = comparison.filter((c: any) => c.isMatching).length;
        const mismatchedItems = comparison.filter((c: any) => !c.isMatching).length;
        const allMatched = mismatchedItems === 0;

        // Update sheet statuses
        if (allMatched) {
            await prisma.countingSheet.updateMany({
                where: {
                    id: { in: [sheet1Id, sheet2Id] }
                },
                data: {
                    status: 'MATCHED'
                }
            });
        }

        return {
            success: true,
            data: {
                comparison,
                matchedItems,
                mismatchedItems,
                allMatched
            }
        };
    } catch (error) {
        console.error('Failed to compare sheets:', error);
        return { success: false, error: 'Failed to compare sheets' };
    }
}

/**
 * Mark sheet for recount
 */
export async function markSheetForRecount(sheetId: string, reason?: string) {
    try {
        await prisma.countingSheet.update({
            where: { id: sheetId },
            data: {
                status: 'REJECTED'
            }
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark sheet for recount:', error);
        return { success: false, error: 'Failed to mark for recount' };
    }
}

/**
 * Reset rejected sheet to draft for recounting
 */
export async function resetSheetForRecount(sheetId: string) {
    try {
        await prisma.countingSheet.update({
            where: { id: sheetId },
            data: {
                status: 'DRAFT',
                counterName: null,
                counterRole: null,
                submittedAt: null
            }
        });

        // Clear all counts
        await prisma.countingSheetItem.updateMany({
            where: { countingSheetId: sheetId },
            data: {
                countedQty: null,
                notes: null
            }
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error) {
        console.error('Failed to reset sheet:', error);
        return { success: false, error: 'Failed to reset sheet' };
    }
}

/**
 * Finalize opname - compare matched sheets with system stock
 */
export async function finalizeOpname(opnameId: string, sheetIds: string[]) {
    try {
        // Get the matched sheets
        const sheets = await prisma.countingSheet.findMany({
            where: {
                id: { in: sheetIds },
                status: 'MATCHED'
            },
            include: {
                items: true
            }
        });

        if (sheets.length === 0) {
            return { success: false, error: 'No matched sheets found' };
        }

        // Get system quantities
        const systemCounts = await prisma.stockOpnameCount.findMany({
            where: { stockOpnameId: opnameId },
            include: {
                item: {
                    select: { sku: true, name: true }
                }
            }
        });

        // Compare with system stock (use first sheet as reference since they match)
        const comparison = systemCounts.map((systemCount: any) => {
            const sheetItem = sheets[0].items.find((i: any) => i.itemId === systemCount.itemId);
            const finalQty = sheetItem?.countedQty || 0;
            const variance = finalQty - systemCount.systemQty;

            return {
                itemId: systemCount.itemId,
                sku: systemCount.item.sku,
                name: systemCount.item.name,
                systemQty: systemCount.systemQty,
                countedQty: finalQty,
                variance
            };
        });

        const hasVariance = comparison.some((c: any) => c.variance !== 0);

        return {
            success: true,
            data: {
                comparison,
                hasVariance,
                totalVariance: comparison.reduce((sum: number, c: any) => sum + c.variance, 0)
            }
        };
    } catch (error) {
        console.error('Failed to finalize opname:', error);
        return { success: false, error: 'Failed to finalize opname' };
    }
}

/**
 * Confirm finalization - update status and create adjustment if needed
 */
export async function confirmFinalization(
    opnameId: string,
    sheetIds: string[],
    createAdjustment: boolean,
    userId: string
) {
    try {
        await prisma.$transaction(async (tx) => {
            // 2. Create Adjustment if requested
            let opnameStatus = 'FINALIZED';

            if (createAdjustment) {
                // Find local user by supabaseId
                const user = await tx.user.findUnique({
                    where: { supabaseId: userId }
                });

                if (!user) throw new Error("User not found in database");

                // We need to calculate variances again to be safe
                const sheets = await tx.countingSheet.findMany({
                    where: { id: { in: sheetIds }, status: 'MATCHED' },
                    include: { items: true }
                });

                if (sheets.length === 0) throw new Error("No matched sheets found");

                const systemCounts = await tx.stockOpnameCount.findMany({
                    where: { stockOpnameId: opnameId }
                });

                // Calculate variances
                const varianceItems = [];
                for (const sysCount of systemCounts) {
                    const sheetItem = sheets[0].items.find(i => i.itemId === sysCount.itemId);
                    const finalQty = sheetItem?.countedQty ?? 0;
                    const variance = finalQty - sysCount.systemQty;

                    if (variance !== 0) {
                        varianceItems.push({
                            itemId: sysCount.itemId,
                            systemQty: sysCount.systemQty,
                            finalQty,
                            variance
                        });
                    }

                    // Update OpnameCount with final values
                    await tx.stockOpnameCount.update({
                        where: { id: sysCount.id },
                        data: {
                            finalQty,
                            variance,
                            isMatching: variance === 0
                        }
                    });
                }

                if (varianceItems.length > 0) {
                    // Variance exists, so we create adjustment AND set status
                    opnameStatus = 'COMPLETED_WITH_ADJUSTMENT';

                    // Generate code
                    const date = new Date();
                    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    const adjCode = `ADJ-OP-${dateStr}-${random}`;

                    // Create Adjustment (PENDING)
                    await tx.stockAdjustment.create({
                        data: {
                            adjustmentCode: adjCode,
                            adjustmentType: 'OPNAME_RESULT',
                            stockOpnameId: opnameId,
                            status: 'PENDING', // Now PENDING for verification
                            notes: `Auto-generated from Stock Opname`,
                            createdById: user.id,
                            // approvedById: user.id, // Removed auto-approval
                            // approvedAt: new Date(), // Removed auto-approval
                            adjustmentItems: {
                                create: varianceItems.map(item => ({
                                    itemId: item.itemId,
                                    qtySystem: item.systemQty,
                                    qtyInput: item.finalQty,
                                    qtyVariance: item.variance,
                                    adjustmentMethod: 'REAL_QTY',
                                    notes: 'Stock Opname Result'
                                }))
                            }
                        }
                    });

                    // NOTE: Inventory update is deferred to Verification (Approve Adjustment)
                }
            }

            // 1. Update Opname Status (Moved to end to use determined status)
            // But we need opname to be finalized first? No, transaction handles it.
            // Actually, we can just update it now.
            await tx.stockOpname.update({
                where: { id: opnameId },
                data: {
                    status: opnameStatus as any, // Cast to any to avoid TS error if client not fully ready
                    completedAt: new Date(),
                }
            });
        });

        revalidatePath('/opname');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to confirm finalization:', error);
        return { success: false, error: error.message || 'Failed to confirm finalization' };
    }
}
