import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface StockValuationItem {
    id: string;
    sku: string;
    name: string;
    category: string;
    uom: string;
    currentStock: number;
    unitPrice: number;
    totalValue: number;
}

export interface PaginatedValuationResponse {
    data: StockValuationItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
        totalItems: number;
        totalStockValue: number;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const skip = (page - 1) * limit;

        // Filter params
        const search = searchParams.get('search') || '';
        const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean) || [];
        const itemIds = searchParams.get('itemIds')?.split(',').filter(Boolean) || [];

        // Build where clause
        const where: Prisma.ItemWhereInput = {
            isActive: true, // Only show active items
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (categoryIds.length > 0) {
            where.categoryId = { in: categoryIds };
        }

        if (itemIds.length > 0) {
            where.id = { in: itemIds };
        }

        // Fetch Items
        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    category: { select: { name: true } },
                    uom: { select: { symbol: true } },
                    // Fetch latest price history to estimate value
                    priceHistories: {
                        orderBy: { validFrom: 'desc' },
                        take: 1,
                    },
                },
            }),
            prisma.item.count({ where }),
        ]);

        // Transform data and calculate value
        const valuationData: StockValuationItem[] = items.map(item => {
            // Default to 0 if no price history
            const unitPrice = item.priceHistories[0]?.unitPrice
                ? Number(item.priceHistories[0].unitPrice)
                : 0;

            return {
                id: item.id,
                sku: item.sku,
                name: item.name,
                category: item.category.name,
                uom: item.uom.symbol,
                currentStock: item.currentStock,
                unitPrice: unitPrice,
                totalValue: item.currentStock * unitPrice,
            };
        });

        // Calculate Summary
        // We need to fetch all matching items to calculate total value as it depends on derived price
        const allMatchingItems = await prisma.item.findMany({
            where,
            select: {
                currentStock: true,
                priceHistories: {
                    orderBy: { validFrom: 'desc' },
                    take: 1,
                    select: { unitPrice: true }
                }
            }
        });

        const totalStock = allMatchingItems.reduce((sum, item) => sum + item.currentStock, 0);

        const totalValue = allMatchingItems.reduce((sum, item) => {
            const price = item.priceHistories[0]?.unitPrice ? Number(item.priceHistories[0].unitPrice) : 0;
            return sum + (item.currentStock * price);
        }, 0);

        const averageUnitValue = totalStock > 0 ? totalValue / totalStock : 0;

        const summary = {
            totalItems: total,
            totalStock: totalStock,
            totalValue: totalValue,
            averageUnitValue: averageUnitValue
        };

        return NextResponse.json({
            data: valuationData,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            summary
        });

    } catch (error) {
        console.error('Error fetching valuation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch valuation', details: String(error) },
            { status: 500 }
        );
    }
}
