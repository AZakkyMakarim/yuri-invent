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

// GET all UOMs with pagination, filtering, and sorting
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const skip = (page - 1) * limit;

        // Filter params
        const symbol = searchParams.get('symbol') || '';
        const name = searchParams.get('name') || '';
        const status = searchParams.get('status')?.split(',').filter(Boolean) || [];
        const creators = searchParams.get('creators')?.split(',').filter(Boolean) || [];
        const dateStart = searchParams.get('dateStart') || '';
        const dateEnd = searchParams.get('dateEnd') || '';

        // Sort params
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

        // Build where clause
        const where: Prisma.UOMWhereInput = {};

        if (symbol) {
            where.symbol = { contains: symbol, mode: 'insensitive' };
        }
        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }
        if (status.length > 0) {
            const isActiveValues = status.map(s => s === 'Active');
            if (isActiveValues.length === 1) {
                where.isActive = isActiveValues[0];
            } else {
                // Both Active and Inactive selected = no filter needed
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
        const orderBy: Prisma.UOMOrderByWithRelationInput = {};
        if (sortField === 'symbol' || sortField === 'code') orderBy.symbol = sortDir;
        else if (sortField === 'name') orderBy.name = sortDir;
        else if (sortField === 'status') orderBy.isActive = sortDir;
        else orderBy.createdAt = sortDir;

        // Execute queries
        const [uoms, total] = await Promise.all([
            prisma.uOM.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    createdBy: {
                        select: { id: true, name: true },
                    },
                },
            }),
            prisma.uOM.count({ where }),
        ]);

        const response: PaginatedResponse<typeof uoms[0]> = {
            data: uoms,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching UOMs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch UOMs' },
            { status: 500 }
        );
    }
}

// POST create new UOM
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, symbol, createdById } = body;
        const isActive = body.isActive ?? true;

        if (!name || !symbol) {
            return NextResponse.json(
                { error: 'Name and symbol are required' },
                { status: 400 }
            );
        }

        const uom = await prisma.uOM.create({
            data: {
                name,
                symbol,
                isActive,
                ...(createdById && { createdById }),
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json(uom, { status: 201 });
    } catch (error: unknown) {
        console.error('Error creating UOM:', error);

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'UOM with this name or symbol already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create UOM' },
            { status: 500 }
        );
    }
}
