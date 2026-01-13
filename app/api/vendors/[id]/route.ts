import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single vendor
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                // createdBy: { select: { id: true, name: true } },
                suppliedItems: {
                    include: {
                        item: {
                            select: { id: true, name: true, sku: true }
                        }
                    }
                },
                _count: {
                    select: { suppliedItems: true },
                },
            },
        });

        if (!vendor) {
            return NextResponse.json(
                { error: 'Vendor not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(vendor);
    } catch (error) {
        console.error('Error fetching vendor:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vendor' },
            { status: 500 }
        );
    }
}

// PUT update vendor
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, vendorType, phone, address, bank, bankBranch, bankAccount, isActive, vendorItems, spkDocumentPath } = body;

        // Validation
        if (!name || !vendorType) {
            return NextResponse.json(
                { error: 'Name and Vendor Type are required' },
                { status: 400 }
            );
        }

        // Update vendor and vendor items in a transaction
        const vendor = await prisma.$transaction(async (tx) => {
            // Update vendor basic info
            const updatedVendor = await tx.vendor.update({
                where: { id },
                data: {
                    name,
                    vendorType,
                    phone,
                    address,
                    bank: bank || null,
                    bankBranch,
                    bankAccount,
                    spkDocumentPath: spkDocumentPath || null,
                    isActive,
                },
            });

            // Handle vendor items if provided
            if (vendorItems && Array.isArray(vendorItems)) {
                // Delete existing vendor items
                await tx.vendorItem.deleteMany({
                    where: { vendorId: id }
                });

                // Create new vendor items
                if (vendorItems.length > 0) {
                    await tx.vendorItem.createMany({
                        data: vendorItems.map((vi: { itemId: string; cogsPerUom: number }) => ({
                            vendorId: id,
                            itemId: vi.itemId,
                            cogsPerUom: vi.cogsPerUom,
                        }))
                    });
                }
            }

            return updatedVendor;
        });

        return NextResponse.json(vendor);
    } catch (error) {
        console.error('Error updating vendor:', error);
        return NextResponse.json(
            { error: 'Failed to update vendor' },
            { status: 500 }
        );
    }
}

// DELETE vendor (Soft delete)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Soft delete
        await prisma.vendor.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ message: 'Vendor soft deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        // Check for reference errors if hard delete was attempted
        return NextResponse.json(
            { error: 'Failed to delete vendor' },
            { status: 500 }
        );
    }
}
