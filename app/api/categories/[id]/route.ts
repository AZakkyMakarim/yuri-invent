import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET single category
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
                items: true,
            },
        });

        if (!category) {
            return NextResponse.json(
                { error: 'Category not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        return NextResponse.json(
            { error: 'Failed to fetch category' },
            { status: 500 }
        );
    }
}

// PUT update category
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, code, isActive } = body;

        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(code !== undefined && { code: code.toUpperCase() }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json(category);
    } catch (error: unknown) {
        console.error('Error updating category:', error);

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Category not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update category' },
            { status: 500 }
        );
    }
}

// DELETE category
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if category has items
        const category = await prisma.category.findUnique({
            where: { id },
            include: { _count: { select: { items: true } } },
        });

        if (!category) {
            return NextResponse.json(
                { error: 'Category not found' },
                { status: 404 }
            );
        }

        if (category._count.items > 0) {
            return NextResponse.json(
                { error: 'Cannot delete category with existing items' },
                { status: 400 }
            );
        }

        await prisma.category.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}
