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

// GET all items with pagination, filtering, and sorting
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const skip = (page - 1) * limit;

        // Filter params
        const sku = searchParams.get('sku') || '';
        const name = searchParams.get('name') || '';
        const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean) || [];
        const uomIds = searchParams.get('uomIds')?.split(',').filter(Boolean) || [];
        const status = searchParams.get('status')?.split(',').filter(Boolean) || [];
        const creators = searchParams.get('creators')?.split(',').filter(Boolean) || [];
        const dateStart = searchParams.get('dateStart') || '';
        const dateEnd = searchParams.get('dateEnd') || '';

        // Sort params
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

        // Build where clause
        const where: Prisma.ItemWhereInput = {};

        if (sku) {
            where.sku = { contains: sku, mode: 'insensitive' };
        }
        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }
        if (categoryIds.length > 0) {
            where.categoryId = { in: categoryIds };
        }
        if (uomIds.length > 0) {
            where.uomId = { in: uomIds };
        }
        if (status.length > 0) {
            const isActiveValues = status.map(s => s === 'Active');
            if (isActiveValues.length === 1) {
                where.isActive = isActiveValues[0];
            }
        }
        if (creators.length > 0) {
            where.createdBy = { name: { in: creators } };
        }
        if (dateStart) {
            where.createdAt = { ...where.createdAt as object, gte: new Date(dateStart) };
        }
        if (dateEnd) {
            const end = new Date(dateEnd);
            end.setHours(23, 59, 59, 999);
            where.createdAt = { ...where.createdAt as object, lte: end };
        }

        // Build orderBy
        const orderBy: Prisma.ItemOrderByWithRelationInput = {};
        if (sortField === 'sku') orderBy.sku = sortDir;
        else if (sortField === 'name') orderBy.name = sortDir;
        else if (sortField === 'category') orderBy.category = { name: sortDir };
        else if (sortField === 'uom') orderBy.uom = { name: sortDir };
        else if (sortField === 'minStockLevel') orderBy.minStockLevel = sortDir;
        else if (sortField === 'maxStockLevel') orderBy.maxStockLevel = sortDir;
        else if (sortField === 'status') orderBy.isActive = sortDir;
        else orderBy.createdAt = sortDir;

        // Execute queries
        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    category: { select: { id: true, name: true, code: true } },
                    uom: { select: { id: true, name: true, symbol: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            }),
            prisma.item.count({ where }),
        ]);

        const response: PaginatedResponse<typeof items[0]> = {
            data: items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items', details: String(error) },
            { status: 500 }
        );
    }
}

// POST create new item
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sku, name, description, categoryId, uomId, minStockLevel, maxStockLevel, createdById } = body;
        const isActive = body.isActive ?? true;

        if (!sku || !name || !categoryId || !uomId) {
            return NextResponse.json(
                { error: 'SKU, name, category, and UOM are required' },
                { status: 400 }
            );
        }

        const item = await prisma.item.create({
            data: {
                sku: sku.toUpperCase(),
                name,
                description,
                categoryId,
                uomId,
                minStockLevel: minStockLevel || 0,
                maxStockLevel: maxStockLevel || 0,
                isActive,
                ...(createdById && { createdById }),
            },
            include: {
                category: { select: { id: true, name: true, code: true } },
                uom: { select: { id: true, name: true, symbol: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error: unknown) {
        console.error('Error creating item:', error);

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Item with this SKU already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create item' },
            { status: 500 }
        );
    }
}
