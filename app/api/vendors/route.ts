import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { generateCode } from '@/lib/utils';

// GET all vendors with pagination, filtering, and sorting
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const skip = (page - 1) * limit;

        // Filter params
        const name = searchParams.get('name') || '';
        const vendorType = searchParams.get('vendorType') || ''; // 'SPK' | 'NON_SPK'
        const bank = searchParams.get('bank') || '';
        const status = searchParams.get('status')?.split(',').filter(Boolean) || [];
        const creators = searchParams.get('creators')?.split(',').filter(Boolean) || [];
        const dateStart = searchParams.get('dateStart') || '';
        const dateEnd = searchParams.get('dateEnd') || '';

        // Sort params
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

        // Build where clause
        const where: Prisma.VendorWhereInput = {};

        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }
        if (vendorType) {
            // @ts-ignore - Prisma enum type check
            where.vendorType = vendorType;
        }
        if (bank) {
            const banks = bank.split(',').filter(Boolean);
            if (banks.length > 0) {
                // @ts-ignore - Prisma enum type check
                where.bank = { in: banks };
            }
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
        const orderBy: Prisma.VendorOrderByWithRelationInput = {};
        if (sortField === 'name') orderBy.name = sortDir;
        else if (sortField === 'vendorType') orderBy.vendorType = sortDir;
        else if (sortField === 'bank') orderBy.bank = sortDir;
        else if (sortField === 'status') orderBy.isActive = sortDir;
        else orderBy.createdAt = sortDir;

        // Execute queries
        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    // createdBy: { select: { id: true, name: true } },
                },
            }),
            prisma.vendor.count({ where }),
        ]);

        return NextResponse.json({
            data: vendors,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vendors' },
            { status: 500 }
        );
    }
}

// POST create new vendor
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, vendorType, phone, address, bank, bankBranch, bankAccount, isActive, vendorItems, spkDocumentPath } = body;

        // Validate required fields
        if (!name || !vendorType) {
            return NextResponse.json(
                { error: 'Name and Vendor Type are required' },
                { status: 400 }
            );
        }

        // Create vendor and vendor items in a transaction
        const vendor = await prisma.$transaction(async (tx) => {
            const newVendor = await tx.vendor.create({
                data: {
                    code: generateCode('VND'),
                    name,
                    vendorType,
                    phone,
                    address,
                    bank: bank || null,
                    bankBranch,
                    bankAccount,
                    spkDocumentPath: spkDocumentPath || null,
                    isActive: isActive ?? true,
                    // In a real app, we'd get the user ID from the session
                    // createdById: session.user.id
                },
            });

            // Create vendor items if provided
            if (vendorItems && Array.isArray(vendorItems) && vendorItems.length > 0) {
                await tx.vendorItem.createMany({
                    data: vendorItems.map((vi: { itemId: string; cogsPerUom: number }) => ({
                        vendorId: newVendor.id,
                        itemId: vi.itemId,
                        cogsPerUom: vi.cogsPerUom,
                    }))
                });
            }

            return newVendor;
        });

        return NextResponse.json(vendor, { status: 201 });
    } catch (error) {
        console.error('Error creating vendor:', error);
        return NextResponse.json(
            { error: 'Failed to create vendor', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
