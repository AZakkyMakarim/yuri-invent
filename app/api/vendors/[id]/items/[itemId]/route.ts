import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT update COGS for vendor-item
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { id: vendorId, itemId } = await params;
        const body = await request.json();
        const { cogsPerUom, link } = body;

        // Validate required fields
        if (cogsPerUom === undefined || cogsPerUom === null) {
            return NextResponse.json(
                { error: 'COGS per UOM is required' },
                { status: 400 }
            );
        }

        // Validate COGS is positive
        if (cogsPerUom < 0) {
            return NextResponse.json(
                { error: 'COGS per UOM must be a positive number' },
                { status: 400 }
            );
        }

        // Check if vendor exists
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) {
            return NextResponse.json(
                { error: 'Vendor not found' },
                { status: 404 }
            );
        }

        // Check for existing relationship
        const existing = await prisma.vendorItem.findFirst({
            where: { vendorId, itemId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Item not found for this vendor' },
                { status: 404 }
            );
        }

        // Update relationship
        const updated = await prisma.vendorItem.update({
            where: { id: existing.id },
            data: {
                cogsPerUom,
                link: link !== undefined ? link : existing.link
            },
            include: {
                item: {
                    include: {
                        category: true,
                        uom: true,
                    },
                },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating vendor item COGS:', error);
        return NextResponse.json(
            { error: 'Failed to update COGS' },
            { status: 500 }
        );
    }
}

// DELETE remove item from vendor
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { id: vendorId, itemId } = await params;

        // Find the vendor-item relationship
        const vendorItem = await prisma.vendorItem.findFirst({
            where: { vendorId, itemId },
        });

        if (!vendorItem) {
            return NextResponse.json(
                { error: 'Vendor-item relationship not found' },
                { status: 404 }
            );
        }

        // Soft delete by setting isActive to false
        await prisma.vendorItem.update({
            where: { id: vendorItem.id },
            data: { isActive: false },
        });

        return NextResponse.json({ message: 'Item removed from vendor successfully' });
    } catch (error) {
        console.error('Error removing item from vendor:', error);
        return NextResponse.json(
            { error: 'Failed to remove item from vendor' },
            { status: 500 }
        );
    }
}
