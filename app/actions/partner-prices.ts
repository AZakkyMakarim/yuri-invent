'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializeDecimal } from '@/lib/utils';

export async function getPartnerPrices(partnerId: string) {
    try {
        // Get all active items
        const items = await prisma.item.findMany({
            where: { isActive: true },
            select: {
                id: true,
                sku: true,
                name: true,
                uom: { select: { symbol: true } }
            },
            orderBy: { name: 'asc' }
        });

        // Get existing custom prices
        const prices = await prisma.partnerItemPrice.findMany({
            where: { partnerId }
        });

        // Map prices to items
        const priceMap = new Map(prices.map(p => [p.itemId, p.price]));

        const result = items.map(item => ({
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            uom: item.uom.symbol,
            price: priceMap.get(item.id) || 0 // Default to 0 if not set
        }));

        return { success: true, data: serializeDecimal(result) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePartnerPrices(partnerId: string, updates: { itemId: string; price: number }[]) {
    try {
        // Transaction to update multiple prices
        await prisma.$transaction(
            updates.map(update =>
                prisma.partnerItemPrice.upsert({
                    where: {
                        partnerId_itemId: {
                            partnerId,
                            itemId: update.itemId
                        }
                    },
                    create: {
                        partnerId,
                        itemId: update.itemId,
                        price: update.price
                    },
                    update: {
                        price: update.price
                    }
                })
            )
        );

        revalidatePath(`/master/partners/${partnerId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
// ... existing imports

export async function getPricingMatrix() {
    try {
        const [partners, items, prices, history] = await Promise.all([
            prisma.partner.findMany({
                where: { isActive: true },
                orderBy: { code: 'asc' },
                select: { id: true, code: true, name: true }
            }),
            prisma.item.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' },
                select: { id: true, sku: true, name: true }
            }),
            prisma.partnerItemPrice.findMany({}),
            prisma.itemPriceHistory.findMany({
                distinct: ['itemId'],
                orderBy: { createdAt: 'desc' },
                select: { itemId: true, unitPrice: true }
            })
        ]);

        // Map prices: { "partnerId_itemId": price }
        const priceMap: Record<string, number> = {};
        prices.forEach(p => {
            priceMap[`${p.partnerId}_${p.itemId}`] = Number(p.price);
        });

        // Map HPP: { "itemId": price }
        const hppMap: Record<string, number> = {};
        history.forEach(h => {
            hppMap[h.itemId] = Number(h.unitPrice);
        });

        return {
            success: true,
            data: {
                partners,
                items,
                priceMap,
                hppMap
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePricingMatrix(updates: { partnerId: string; itemId: string; price: number }[]) {
    try {
        await prisma.$transaction(
            updates.map(update =>
                prisma.partnerItemPrice.upsert({
                    where: {
                        partnerId_itemId: {
                            partnerId: update.partnerId,
                            itemId: update.itemId
                        }
                    },
                    create: {
                        partnerId: update.partnerId,
                        itemId: update.itemId,
                        price: update.price
                    },
                    update: {
                        price: update.price
                    }
                })
            )
        );

        revalidatePath('/master/partners/pricing');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
