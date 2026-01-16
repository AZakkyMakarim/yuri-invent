'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';

/**
 * Get all active items for item picker
 * Optionally filter by vendor to get vendor-specific pricing
 */
export async function getItemsForPicker(vendorId?: string) {
    try {
        const items = await prisma.item.findMany({
            where: {
                isActive: true
            },
            include: {
                category: {
                    select: {
                        name: true,
                        code: true
                    }
                },
                uom: {
                    select: {
                        name: true,
                        symbol: true
                    }
                },
                vendorSupplies: vendorId ? {
                    where: {
                        vendorId: vendorId,
                        isActive: true
                    },
                    select: {
                        cogsPerUom: true,
                        isActive: true
                    }
                } : false
            },
            orderBy: {
                name: 'asc'
            }
        });

        return {
            success: true,
            data: serializeDecimal(items)
        };
    } catch (error: any) {
        console.error('Failed to fetch items:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch items'
        };
    }
}
