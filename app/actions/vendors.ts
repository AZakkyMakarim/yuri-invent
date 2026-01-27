'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';

export async function getVendors() {
    try {
        const vendors = await prisma.vendor.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                code: true
            }
        });

        return { success: true, data: serializeDecimal(vendors) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createVendor(data: {
    name: string;
    phone?: string;
    address?: string;
}) {
    try {
        // Validate duplicates
        const existing = await prisma.vendor.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' }
            }
        });

        if (existing) {
            return { success: false, error: 'Vendor with this name already exists' };
        }

        // Generate Code: V-YYYYMMDD-XXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomInfo = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `V-${dateStr}-${randomInfo}`;

        const vendor = await prisma.vendor.create({
            data: {
                name: data.name,
                code: code,
                phone: data.phone,
                address: data.address,
                isActive: true,
                vendorType: 'NON_SPK'
            }
        });

        return { success: true, data: serializeDecimal(vendor) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
