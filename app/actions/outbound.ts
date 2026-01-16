'use server';

import { prisma } from '@/lib/prisma';
import { OutboundStatus } from '@/app/generated/prisma/client';

export async function getOutboundList(
    page = 1,
    limit = 10,
    search = ''
) {
    try {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.OR = [
                { outboundCode: { contains: search, mode: 'insensitive' } },
                { mitra: { name: { contains: search, mode: 'insensitive' } } },
                { purpose: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.outbound.findMany({
                where,
                skip,
                take: limit,
                orderBy: { requestDate: 'desc' },
                include: {
                    mitra: { select: { name: true } },
                    _count: { select: { items: true } }
                }
            }),
            prisma.outbound.count({ where })
        ]);

        return {
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error: any) {
        console.error('Failed to fetch outbound listing:', error);
        return { success: false, error: error.message };
    }
}

export async function getOutboundById(id: string) {
    try {
        const outbound = await prisma.outbound.findUnique({
            where: { id },
            include: {
                mitra: true,
                createdBy: { select: { name: true, email: true } },
                approvedBy: { select: { name: true, email: true } },
                items: {
                    include: {
                        item: {
                            include: {
                                uom: true,
                                brand: true
                            }
                        }
                    }
                }
            }
        });
        return { success: true, data: outbound };
    } catch (error: any) {
        console.error('Failed to fetch outbound detail:', error);
        return { success: false, error: error.message };
    }
}

export async function createOutbound(data: {
    userId: string;
    mitraId?: string;
    purpose?: string;
    notes?: string;
    items: { itemId: string; requestedQty: number; notes?: string }[]
}) {
    try {
        if (!data.items || data.items.length === 0) {
            throw new Error("At least one item is required");
        }

        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const outboundCode = `OUT-${dateStr}-${random}`;

        const outbound = await prisma.outbound.create({
            data: {
                outboundCode,
                createdById: data.userId,
                mitraId: data.mitraId,
                purpose: data.purpose,
                notes: data.notes,
                status: 'DRAFT',
                items: {
                    create: data.items.map(item => ({
                        itemId: item.itemId,
                        requestedQty: item.requestedQty,
                        notes: item.notes
                    }))
                }
            }
        });

        return { success: true, data: outbound };
    } catch (error: any) {
        console.error('Failed to create outbound:', error);
        return { success: false, error: error.message };
    }
}
