import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const skip = (page - 1) * limit;

        // Filter params
        const itemId = searchParams.get('itemId') || '';
        const search = searchParams.get('search') || '';
        const dateStart = searchParams.get('dateStart') || '';
        const dateEnd = searchParams.get('dateEnd') || '';
        const movementType = searchParams.get('movementType') as Prisma.EnumStockMovementTypeFilter | '';

        // Build where clause
        const where: Prisma.StockCardWhereInput = {};

        if (itemId) {
            where.itemId = itemId;
        }

        if (search) {
            where.item = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                ]
            };
        }

        if (movementType) {
            where.movementType = movementType; // INBOUND, OUTBOUND, etc.
        }

        if (dateStart) {
            where.transactionDate = { ...where.transactionDate as object, gte: new Date(dateStart) };
        }
        if (dateEnd) {
            const end = new Date(dateEnd);
            end.setHours(23, 59, 59, 999);
            where.transactionDate = { ...where.transactionDate as object, lte: end };
        }

        // Execute queries
        const [cards, total] = await Promise.all([
            prisma.stockCard.findMany({
                where,
                orderBy: { transactionDate: 'desc' }, // Latest first
                skip,
                take: limit,
                include: {
                    item: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            uom: { select: { symbol: true } }
                        }
                    },
                    inbound: { select: { grnNumber: true } },
                    outbound: { select: { outboundCode: true } },
                    stockAdjustment: { select: { adjustmentCode: true } },
                    return: { select: { returnCode: true } },
                }
            }),
            prisma.stockCard.count({ where }),
        ]);

        const response: PaginatedResponse<typeof cards[0]> = {
            data: cards,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching stock cards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock cards', details: String(error) },
            { status: 500 }
        );
    }
}
