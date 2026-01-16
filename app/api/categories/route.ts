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

// GET all categories with pagination, filtering, and sorting
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const skip = (page - 1) * limit;

        // Filter params
        const code = searchParams.get('code') || '';
        const name = searchParams.get('name') || '';
        const status = searchParams.get('status')?.split(',').filter(Boolean) || [];
        const creators = searchParams.get('creators')?.split(',').filter(Boolean) || [];
        const dateStart = searchParams.get('dateStart') || '';
        const dateEnd = searchParams.get('dateEnd') || '';

        // Sort params
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

        // Build where clause
        const where: Prisma.CategoryWhereInput = {};

        if (code) {
            where.code = { contains: code, mode: 'insensitive' };
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
        const orderBy: Prisma.CategoryOrderByWithRelationInput = {};
        if (sortField === 'code') orderBy.code = sortDir;
        else if (sortField === 'name') orderBy.name = sortDir;
        else if (sortField === 'status') orderBy.isActive = sortDir;
        else orderBy.createdAt = sortDir;

        // Execute queries
        const [categories, total] = await Promise.all([
            prisma.category.findMany({
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
            prisma.category.count({ where }),
        ]);

        const response: PaginatedResponse<typeof categories[0]> = {
            data: categories,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

// POST create new category
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, code, createdById } = body;
        const isActive = body.isActive ?? true;

        if (!name || !code) {
            return NextResponse.json(
                { error: 'Name and code are required' },
                { status: 400 }
            );
        }

        const category = await prisma.category.create({
            data: {
                name,
                code: code.toUpperCase(),
                isActive,
                ...(createdById && { createdById }),
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error: unknown) {
        console.error('Error creating category:', error);

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Category with this name or code already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create category' },
            { status: 500 }
        );
    }
}
