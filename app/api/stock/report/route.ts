import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');
        const month = parseInt(searchParams.get('month') || '');
        const year = parseInt(searchParams.get('year') || '');

        if (!itemId || isNaN(month) || isNaN(year)) {
            return NextResponse.json(
                { error: 'ItemId, month, and year are required' },
                { status: 400 }
            );
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

        // 1. Fetch Item Details
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                uom: { select: { symbol: true } },
                category: { select: { name: true } },
            }
        });

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // 2. Calculate Opening Stock (Sum of all changes BEFORE startDate)
        const openingStockAgg = await prisma.stockCard.aggregate({
            _sum: {
                quantityChange: true
            },
            where: {
                itemId,
                transactionDate: {
                    lt: startDate
                }
            }
        });

        const openingStock = openingStockAgg._sum.quantityChange || 0;

        // 3. Fetch Movements within the month
        const movements = await prisma.stockCard.findMany({
            where: {
                itemId,
                transactionDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                transactionDate: 'asc'
            },
            include: {
                inbound: { select: { grnNumber: true } },
                outbound: { select: { outboundCode: true } },
                stockAdjustment: { select: { adjustmentCode: true } },
                return: { select: { returnCode: true } },
            }
        });

        return NextResponse.json({
            item: {
                name: item.name,
                sku: item.sku,
                uom: item.uom.symbol,
                minStock: item.minStockLevel,
                maxStock: item.maxStockLevel,
                category: item.category.name
            },
            period: {
                month,
                year,
                startDate,
                endDate
            },
            openingStock,
            movements
        });

    } catch (error) {
        console.error('Error fetching stock report:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock report', details: String(error) },
            { status: 500 }
        );
    }
}
