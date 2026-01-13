import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT update UOM
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, symbol, isActive } = body;

        const uom = await prisma.uOM.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(symbol !== undefined && { symbol }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json(uom);
    } catch (error: unknown) {
        console.error('Error updating UOM:', error);

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
            return NextResponse.json(
                { error: 'UOM not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update UOM' },
            { status: 500 }
        );
    }
}

// DELETE UOM
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if UOM is used by items
        const uom = await prisma.uOM.findUnique({
            where: { id },
            include: { _count: { select: { items: true } } },
        });

        if (!uom) {
            return NextResponse.json(
                { error: 'UOM not found' },
                { status: 404 }
            );
        }

        if (uom._count.items > 0) {
            return NextResponse.json(
                { error: 'Cannot delete UOM used by existing items' },
                { status: 400 }
            );
        }

        await prisma.uOM.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting UOM:', error);
        return NextResponse.json(
            { error: 'Failed to delete UOM' },
            { status: 500 }
        );
    }
}
