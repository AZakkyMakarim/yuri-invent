'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';

export async function getVendors() {
    try {
        const vendors = await prisma.vendor.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true
            }
        });

        return { success: true, data: serializeDecimal(vendors) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createVendor(data: {
    name: string;
    phone?: string;
    address?: string;
}) {
    try {
        // Validate duplicates
        const existing = await prisma.vendor.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' }
            }
        });

        if (existing) {
            return { success: false, error: 'Vendor with this name already exists' };
        }

        // Generate Code: V-YYYYMMDD-XXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomInfo = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `V-${dateStr}-${randomInfo}`;

        const vendor = await prisma.vendor.create({
            data: {
                name: data.name,
                code: code,
                phone: data.phone,
                address: data.address,
                isActive: true,
                vendorType: 'NON_SPK'
            }
        });

        return { success: true, data: serializeDecimal(vendor) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getVendorPurchaseHistory(vendorId: string) {
    try {
        const purchases = await prisma.purchaseRequest.findMany({
            where: {
                vendorId: vendorId,
                status: {
                    notIn: ['DRAFT', 'CANCELLED', 'REJECTED']
                }
            },
            include: {
                inbounds: {
                    select: {
                        grnNumber: true
                    }
                }
            },
            orderBy: {
                requestDate: 'desc'
            }
        });

        return { success: true, data: serializeDecimal(purchases) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getVendorPriceHistory(vendorId: string) {
    try {
        // Fetch all items purchased from this vendor
        // We look for items in PRs that are at least CONFIRMED
        const items = await prisma.purchaseRequestItem.findMany({
            where: {
                purchaseRequest: {
                    vendorId: vendorId,
                    status: {
                        notIn: ['DRAFT', 'PENDING_MANAGER_APPROVAL', 'REJECTED', 'CANCELLED']
                    }
                }
            },
            include: {
                purchaseRequest: {
                    select: {
                        prNumber: true,
                        poNumber: true,
                        requestDate: true,
                        status: true
                    }
                },
                item: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        uom: true
                    }
                }
            },
            orderBy: {
                purchaseRequest: {
                    requestDate: 'asc' // Ascending for chart
                }
            }
        });

        // Filter and map interesting data
        // Priority: verifiedUnitPrice (real price) > unitPrice (estimated)
        const history = items.map(record => ({
            id: record.id,
            date: record.purchaseRequest.requestDate,
            itemId: record.item.id,
            sku: record.item.sku,
            itemName: record.item.name,
            uom: record.item.uom.symbol,
            price: record.verifiedUnitPrice || record.unitPrice,
            prNumber: record.purchaseRequest.prNumber,
            poNumber: record.purchaseRequest.poNumber
        }));

        return { success: true, data: serializeDecimal(history) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
