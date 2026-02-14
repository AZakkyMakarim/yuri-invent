'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getPartners() {
    try {
        const partners = await prisma.partner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: partners };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Helper to generate code: MTR-001
async function generatePartnerCode() {
    const lastPartner = await prisma.partner.findFirst({
        orderBy: { code: 'desc' }
    });

    if (!lastPartner) return 'MTR-001';

    // Extract number from MTR-XXX
    const match = lastPartner.code.match(/MTR-(\d+)/);
    if (!match) return 'MTR-001'; // Fallback if format doesn't match

    const nextNum = parseInt(match[1]) + 1;
    return `MTR-${nextNum.toString().padStart(3, '0')}`;
}

export async function createPartner(data: any) {
    try {
        const code = await generatePartnerCode();

        const partner = await prisma.partner.create({
            data: {
                code: code,
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                contactName: data.contactName,
                bankName: data.bankName,
                bankBranch: data.bankBranch,
                bankAccount: data.bankAccount,
                isActive: data.isActive
            }
        });
        revalidatePath('/master/partners');
        return { success: true, data: partner };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePartner(id: string, data: any) {
    try {
        const partner = await prisma.partner.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                contactName: data.contactName,
                bankName: data.bankName,
                bankBranch: data.bankBranch,
                bankAccount: data.bankAccount,
                isActive: data.isActive
            }
        });
        revalidatePath('/master/partners');
        revalidatePath(`/master/partners/${id}`);
        return { success: true, data: partner };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPartner(id: string) {
    try {
        const partner = await prisma.partner.findUnique({
            where: { id }
        });
        return { success: true, data: partner };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Get Sales History (Outbounds to this partner)
export async function getPartnerSalesHistory(partnerId: string) {
    try {
        const sales = await prisma.outbound.findMany({
            where: { partnerId },
            include: {
                items: {
                    include: {
                        item: true
                    }
                }
            },
            orderBy: { requestDate: 'desc' }
        });

        const formattedSales = sales.map(s => ({
            id: s.id,
            date: s.requestDate,
            code: s.outboundCode,
            status: s.status,
            itemCount: s.items.length,
            notes: s.notes,
            items: s.items.map(i => ({
                name: i.item.name,
                sku: i.item.sku,
                qty: i.releasedQty
            }))
        }));

        return { success: true, data: formattedSales };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


