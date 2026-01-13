import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET single item
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const item = await prisma.item.findUnique({
            where: { id },
            include: {
                category: { select: { id: true, name: true, code: true } },
                uom: { select: { id: true, name: true, symbol: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        return NextResponse.json(
            { error: 'Failed to fetch item' },
            { status: 500 }
        );
    }
}

// PUT update item
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { sku, name, description, categoryId, uomId, minStockLevel, maxStockLevel, isActive } = body;

        const item = await prisma.item.update({
            where: { id },
            data: {
                ...(sku !== undefined && { sku: sku.toUpperCase() }),
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(categoryId !== undefined && { categoryId }),
                ...(uomId !== undefined && { uomId }),
                ...(minStockLevel !== undefined && { minStockLevel }),
                ...(maxStockLevel !== undefined && { maxStockLevel }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                category: { select: { id: true, name: true, code: true } },
                uom: { select: { id: true, name: true, symbol: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(item);
    } catch (error: unknown) {
        console.error('Error updating item:', error);

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update item' },
            { status: 500 }
        );
    }
}

// DELETE item
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if item has related records
        const item = await prisma.item.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        purchaseRequestItems: true,
                        inboundItems: true,
                        outboundItems: true,
                        stockCards: true,
                    },
                },
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        const totalRelated =
            item._count.purchaseRequestItems +
            item._count.inboundItems +
            item._count.outboundItems +
            item._count.stockCards;

        if (totalRelated > 0) {
            return NextResponse.json(
                { error: 'Cannot delete item with transaction history' },
                { status: 400 }
            );
        }

        await prisma.item.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        return NextResponse.json(
            { error: 'Failed to delete item' },
            { status: 500 }
        );
    }
}
