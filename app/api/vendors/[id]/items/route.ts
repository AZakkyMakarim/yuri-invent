import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all items for a specific vendor
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: vendorId } = await params;
        const { searchParams } = new URL(request.url);

        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const skip = (page - 1) * limit;

        const [vendorItems, total] = await Promise.all([
            prisma.vendorItem.findMany({
                where: { vendorId, isActive: true },
                include: {
                    item: {
                        select: {
                            id: true,
                            sku: true,
                            name: true,
                            imagePath: true,
                            category: true,
                            uom: true
                        }
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.vendorItem.count({ where: { vendorId, isActive: true } }),
        ]);

        return NextResponse.json({
            data: vendorItems,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching vendor items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vendor items' },
            { status: 500 }
        );
    }
}

// POST add item(s) to vendor
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: vendorId } = await params;
        const body = await request.json();
        const { itemId, cogsPerUom, link } = body;

        // Validate required fields
        if (!itemId || cogsPerUom === undefined || cogsPerUom === null) {
            return NextResponse.json(
                { error: 'Item ID and COGS per UOM are required' },
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

        // Check if item exists
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (!item) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        // Check for existing relationship
        const existing = await prisma.vendorItem.findFirst({
            where: { vendorId, itemId },
        });

        if (existing) {
            // Update existing relationship
            const updated = await prisma.vendorItem.update({
                where: { id: existing.id },
                data: { cogsPerUom, isActive: true, link: link || null },
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
        } else {
            // Create new relationship
            const vendorItem = await prisma.vendorItem.create({
                data: {
                    vendorId,
                    itemId,
                    cogsPerUom,
                    link: link || null,
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
            return NextResponse.json(vendorItem, { status: 201 });
        }
    } catch (error) {
        console.error('Error adding item to vendor:', error);
        return NextResponse.json(
            { error: 'Failed to add item to vendor' },
            { status: 500 }
        );
    }
}
