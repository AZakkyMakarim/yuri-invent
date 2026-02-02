'use server';

import prisma from '@/lib/prisma';

export async function getBlankCountingSheetData(opnameId: string) {
    try {
        const opname = await prisma.stockOpname.findUnique({
            where: { id: opnameId },
            include: {
                counts: {
                    include: {
                        item: {
                            include: {
                                category: true,
                                uom: true,
                            }
                        }
                    },
                    orderBy: {
                        item: {
                            name: 'asc'
                        }
                    }
                }
            }
        });

        if (!opname) {
            throw new Error("Stock Opname not found");
        }

        // Transform to blank sheet format
        const sheetData = {
            title: `BLANK COUNTING SHEET`,
            opnameId: opname.id,
            location: '', // Can be added from opname metadata if needed
            scheduledDate: opname.scheduledDate,
            items: opname.counts.map((count: any, index: number) => ({
                no: index + 1,
                itemName: count.item.name,
                sku: count.item.sku,
                unit: count.item.uom?.symbol || '-',
                // Don't include system qty or any counts - this is a BLANK sheet
            }))
        };

        return { success: true, data: sheetData };
    } catch (error: any) {
        console.error('Failed to get blank sheet data:', error);
        return { success: false, error: error.message };
    }
}
