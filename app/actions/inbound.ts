'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import {
    InboundStatus,
    Prisma,
    StockMovementType,
    InboundDiscrepancyType,
    DiscrepancyResolution,
    Warehouse
} from '@prisma/client';

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
            include: { items: true, vendor: true }
        });

        if (!existingInbound) throw new Error('Inbound not found');
        if (existingInbound.status !== 'PENDING_VERIFICATION') {
            throw new Error('Inbound is not pending verification');
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Inbound Status -> VERIFIED
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

            // Prepare Action Lists
            const shortageItems: { itemId: string, qty: number }[] = [];
            const returnItems: { itemId: string, qty: number, reason: string, type: 'OVERAGE' | 'WRONG_ITEM' | 'DAMAGED' }[] = [];

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
                            discrepancyReason: itemInput.discrepancyReason
                        }
                    });

                    // 3. Update Stock (WarehouseStock + Item Total)
                    if (itemInput.acceptedQty > 0) {
                        // A. Determine Warehouse (Use Inbound specific or fallback to Main)
                        let targetWarehouseId = existingInbound.warehouseId;
                        if (!targetWarehouseId) {
                            const mainWh = await tx.warehouse.findFirst({ where: { isDefault: true } });
                            targetWarehouseId = mainWh?.id ?? null;
                        }

                        if (!targetWarehouseId) {
                            throw new Error("No warehouse specified and no default warehouse found.");
                        }

                        // B. Update/Create WarehouseStock
                        await tx.warehouseStock.upsert({
                            where: {
                                warehouseId_itemId: {
                                    warehouseId: targetWarehouseId!,
                                    itemId: itemInput.itemId
                                }
                            },
                            create: {
                                warehouseId: targetWarehouseId!,
                                itemId: itemInput.itemId,
                                quantity: itemInput.acceptedQty
                            },
                            update: {
                                quantity: { increment: itemInput.acceptedQty }
                            }
                        });

                        // C. Update Total Item Stock (Cached Sum)
                        const updatedItem = await tx.item.update({
                            where: { id: itemInput.itemId },
                            data: {
                                currentStock: {
                                    increment: itemInput.acceptedQty
                                }
                            }
                        });

                        const qtyAfter = updatedItem.currentStock; // This is total stock level
                        // Calculate specific warehouse stock after?
                        // For Stock Card, we usually track specific warehouse balance.
                        // Let's resolve the warehouse balance for the card.
                        const whStock = await tx.warehouseStock.findUnique({
                            where: {
                                warehouseId_itemId: {
                                    warehouseId: targetWarehouseId,
                                    itemId: itemInput.itemId
                                }
                            }
                        });
                        const whQtyAfter = whStock?.quantity || 0;
                        const whQtyBefore = whQtyAfter - itemInput.acceptedQty;

                        // Create Stock Card
                        await tx.stockCard.create({
                            data: {
                                itemId: itemInput.itemId,
                                warehouseId: targetWarehouseId, // Add warehouse context
                                movementType: 'INBOUND',
                                referenceType: 'INBOUND',
                                referenceId: id,
                                inboundId: id,
                                quantityBefore: whQtyBefore,
                                quantityChange: itemInput.acceptedQty,
                                quantityAfter: whQtyAfter,
                                notes: `Inbound ${verifiedInbound.grnNumber}: Accepted ${itemInput.acceptedQty} / Received ${itemInput.receivedQty}`,
                                transactionDate: new Date()
                            }
                        });
                    }

                    // 4. Detect Shortage (Expected > Received)
                    if (itemInput.receivedQty < itemInput.expectedQty) {
                        shortageItems.push({
                            itemId: itemInput.itemId,
                            qty: itemInput.expectedQty - itemInput.receivedQty
                        });
                    }

                    // 5. Detect Overage (Received > Expected)
                    if (itemInput.receivedQty > itemInput.expectedQty) {
                        returnItems.push({
                            itemId: itemInput.itemId,
                            qty: itemInput.receivedQty - itemInput.expectedQty,
                            reason: 'Overage received',
                            type: 'OVERAGE'
                        });
                    }

                    // 6. Detect Rejected (Wrong/Damaged)
                    if (itemInput.rejectedQty > 0) {
                        returnItems.push({
                            itemId: itemInput.itemId,
                            qty: itemInput.rejectedQty,
                            reason: itemInput.discrepancyReason || (itemInput.discrepancyType === 'WRONG_ITEM' ? 'Wrong Item' : 'Damaged'),
                            type: itemInput.discrepancyType as any
                        });
                    }
                }
            }

            // 7. Handle Shortage -> Create Child GRN
            if (shortageItems.length > 0) {
                // Generate Child GRN Number (e.g., GRN-XXX-A)
                // Simplified logic: Append suffix based on existing children count?
                // For now, let's just append a random suffix or use a timestamp to ensure uniqueness, or better, query children.
                const childCount = await tx.inbound.count({ where: { parentInboundId: id } });
                const suffix = String.fromCharCode(65 + childCount); // A, B, C...
                const childGrnNumber = `${existingInbound.grnNumber}-${suffix}`;

                await tx.inbound.create({
                    data: {
                        grnNumber: childGrnNumber, // Note: This might collide if not careful, but good enough for MVP
                        purchaseRequestId: existingInbound.purchaseRequestId,
                        vendorId: existingInbound.vendorId,
                        parentInboundId: id,
                        receiveDate: new Date(), // Reset receive date? Or keep original?
                        status: 'PENDING_VERIFICATION', // Ready to be verified when they arrive
                        notes: `Partial delivery balance from ${existingInbound.grnNumber}`,
                        createdById: userId,
                        items: {
                            create: shortageItems.map(s => ({
                                itemId: s.itemId,
                                expectedQuantity: s.qty,
                                receivedQuantity: 0
                            }))
                        },
                        warehouseId: existingInbound.warehouseId // Inherit warehouse
                    }
                });
            }

            // 8. Handle Returns -> Create Return Record
            if (returnItems.length > 0) {
                // Generate Return Code
                const year = new Date().getFullYear();
                const month = String(new Date().getMonth() + 1).padStart(2, '0');
                const returnCount = await tx.return.count({
                    where: { returnCode: { startsWith: `RET/${year}/${month}` } }
                });
                const returnCode = `RET/${year}/${month}/${String(returnCount + 1).padStart(4, '0')}`;

                await tx.return.create({
                    data: {
                        returnCode,
                        purchaseRequestId: existingInbound.purchaseRequestId,
                        inboundId: id,
                        vendorId: existingInbound.vendorId,
                        returnDate: new Date(),
                        reason: 'OTHER', // Default, lines have specifics
                        status: 'DRAFT', // Needs resolution input
                        notes: `Generated from Inbound ${existingInbound.grnNumber} discrepancies`,
                        createdById: userId,
                        items: {
                            create: returnItems.map(r => ({
                                itemId: r.itemId,
                                quantity: r.qty,
                                unitPrice: new Prisma.Decimal(0), // Placeholder, need to fetch price?
                                totalPrice: new Prisma.Decimal(0),
                                reason: `${r.type}: ${r.reason}`
                            }))
                        }
                    }
                });
            }

            return verifiedInbound;
        });

        revalidatePath('/inbound');
        revalidatePath('/inbound/verification');
        revalidatePath('/stock');
        revalidatePath('/inbound/issues');

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
        console.error('Failed to fetch inbounds:', error);
        return { success: false, error: error.message };
    }
}

export async function getPendingShortages(
    page = 1,
    limit = 10,
    search = ''
): Promise<ActionResponse> {
    try {
        const skip = (page - 1) * limit;
        const where: Prisma.InboundWhereInput = {
            status: 'PENDING_VERIFICATION',
            parentInboundId: { not: null }
        };

        if (search) {
            where.OR = [
                { grnNumber: { contains: search, mode: 'insensitive' } },
                { vendor: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.inbound.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    vendor: true,
                    parentInbound: { select: { grnNumber: true } },
                    _count: { select: { items: true } }
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
        return { success: false, error: error.message };
    }
}

export async function closeShortage(inboundId: string, notes?: string) {
    try {
        // "Closing" a shortage means we are not expecting the goods anymore.
        // We can either DELETE the child inbound or mark it as REJECTED.
        // REJECTED is safer for history.

        await prisma.inbound.update({
            where: { id: inboundId },
            data: {
                status: 'REJECTED',
                notes: notes ? `Shortage Closed: ${notes}` : 'Shortage Closed',
                updatedAt: new Date()
            }
        });

        revalidatePath('/inbound/issues');
        revalidatePath('/inbound');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export type UnifiedInboundIssue = {
    id: string; // inbound.id (Shortage) OR inboundItem.id (Discrepancy)
    type: 'SHORTAGE' | 'OVERAGE' | 'WRONG_ITEM' | 'DAMAGED';
    date: Date | string;
    grnNumber: string;
    vendorName: string;
    itemName?: string;
    sku?: string;
    qtyInvolved: number;
    status: 'PENDING' | 'RESOLVED';
    resolvedAction?: string;
    data: any; // Original Object
};

export async function getUnifiedInboundIssues(
    page = 1,
    limit = 20,
    search = ''
): Promise<ActionResponse> {
    try {
        // 1. Fetch Shortages (Inbound with PENDING_VERIFICATION and parentInboundId)
        const shortageWhere: Prisma.InboundWhereInput = {
            status: 'PENDING_VERIFICATION',
            parentInboundId: { not: null }
        };
        if (search) {
            shortageWhere.OR = [
                { grnNumber: { contains: search, mode: 'insensitive' } },
                { vendor: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const shortages = await prisma.inbound.findMany({
            where: shortageWhere,
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: true,
                items: { include: { item: true } }, // To calculate expected qty
            }
        });

        // 2. Fetch Discrepancies (InboundItem with discrepancyType != NONE)
        const discrepancyWhere: Prisma.InboundItemWhereInput = {
            discrepancyType: { not: 'NONE' },
            // Filter only pending? User wants all issues, maybe filter by status separately?
            // Let's separate resolved vs pending at UI level if needed, or sort pending first.
            // discrepancyAction: { equals: null } // If we want only pending
        };
        if (search) {
            discrepancyWhere.OR = [
                { inbound: { grnNumber: { contains: search, mode: 'insensitive' } } },
                { item: { name: { contains: search, mode: 'insensitive' } } },
                { item: { sku: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const discrepancies = await prisma.inboundItem.findMany({
            where: discrepancyWhere,
            orderBy: { inbound: { receiveDate: 'desc' } },
            include: {
                inbound: { include: { vendor: true } },
                item: true
            }
        });

        // 3. Map to Unified Format
        const unifiedList: UnifiedInboundIssue[] = [];

        // Map Shortages
        shortages.forEach(s => {
            // Calculate total expected qty for this child inbound
            const totalQty = s.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
            unifiedList.push({
                id: s.id,
                type: 'SHORTAGE',
                date: s.receiveDate,
                grnNumber: s.grnNumber,
                vendorName: s.vendor.name,
                itemName: s.items.length === 1 ? s.items[0].item.name : `${s.items.length} Items`,
                sku: s.items.length === 1 ? s.items[0].item.sku : undefined,
                qtyInvolved: totalQty,
                status: 'PENDING', // Shortages fetched are always pending verification
                data: serializeDecimal(s)
            });
        });

        // Map Discrepancies
        discrepancies.forEach(d => {
            let qty = 0;
            if (d.discrepancyType === 'OVERAGE') {
                qty = d.receivedQuantity - d.expectedQuantity;
            } else {
                qty = d.rejectedQuantity;
            }

            unifiedList.push({
                id: d.id,
                type: d.discrepancyType as any,
                date: d.inbound.receiveDate,
                grnNumber: d.inbound.grnNumber,
                vendorName: d.inbound.vendor.name,
                itemName: d.item.name,
                sku: d.item.sku,
                qtyInvolved: qty,
                status: (d.discrepancyAction && d.discrepancyAction !== 'PENDING') ? 'RESOLVED' : 'PENDING',
                resolvedAction: d.discrepancyAction || undefined,
                data: serializeDecimal(d)
            });
        });

        // 4. Sort (Pending first, then Date desc)
        unifiedList.sort((a, b) => {
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // 5. Pagination (Manual slicing)
        const total = unifiedList.length;
        const totalPages = Math.ceil(total / limit);
        const slicedData = unifiedList.slice((page - 1) * limit, page * limit);

        return {
            success: true,
            data: slicedData,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };

    } catch (error: any) {
        console.error('Failed to fetch Unified Inbound Issues:', error);
        return { success: false, error: error.message };
    }
}
