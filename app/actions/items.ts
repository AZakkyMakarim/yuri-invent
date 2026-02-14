'use server';

import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';

/**
 * Get all active items for item picker
 * Optionally filter by vendor to get vendor-specific pricing
 */
export async function getItemsForPicker(vendorId?: string) {
    try {
        const items = await prisma.item.findMany({
            where: {
                isActive: true
            },
            include: {
                category: {
                    select: {
                        name: true,
                        code: true
                    }
                },
                uom: {
                    select: {
                        name: true,
                        symbol: true
                    }
                },
                vendorSupplies: vendorId ? {
                    where: {
                        vendorId: vendorId,
                        isActive: true
                    },
                    select: {
                        cogsPerUom: true,
                        isActive: true
                    }
                } : false
            },
            orderBy: {
                name: 'asc'
            }
        });

        return {
            success: true,
            data: serializeDecimal(items)
        };
    } catch (error: any) {
        console.error('Failed to fetch items:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch items'
        };
    }
}

export async function searchItems(query: string) {
    try {
        let whereClause: any = { isActive: true };

        if (query) {
            whereClause.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } }
            ];
        }

        const items = await prisma.item.findMany({
            where: whereClause,
            take: 20,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                sku: true,
                currentStock: true,
                uom: { select: { symbol: true } }
            }
        });

        return items;
    } catch (error) {
        console.error('Failed to search items:', error);
        return [];
    }
}

export async function searchStockedItems(query: string) {
    try {
        const items = await prisma.item.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } }
                ],
                isActive: true,
                currentStock: {
                    gt: 0
                }
            },
            take: 20,
            select: {
                id: true,
                name: true,
                sku: true,
                currentStock: true
            }
        });

        return items;
    } catch (error) {
        console.error('Failed to search stocked items:', error);
        return [];
    }
}

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, code: true }
        });
        return { success: true, data: categories };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUOMs() {
    try {
        const uoms = await prisma.uOM.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, symbol: true }
        });
        return { success: true, data: uoms };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createItem(data: {
    name: string;
    categoryId: string;
    uomId: string;
    vendorId?: string;
    price?: number;
    // Extended fields
    sku?: string;
    description?: string;
    barcode?: string;
    brand?: string;
    type?: string;
    color?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    movementType?: string;
    imagePath?: string | null;
    minStockLevel?: number;
    maxStockLevel?: number;
}) {
    try {
        // Check for duplicates
        const existing = await prisma.item.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' },
                isActive: true
            }
        });

        if (existing) {
            return { success: false, error: 'Item with this name already exists' };
        }

        const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: 'Category not found' };

        // Generate SKU if not provided: CAT-RND-TIMESTAMP
        let sku = data.sku;
        if (!sku) {
            const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            sku = `${category.code}-${randomPart}-${Date.now().toString().slice(-4)}`;
        }

        const item = await prisma.item.create({
            data: {
                name: data.name,
                sku: sku,
                categoryId: data.categoryId,
                uomId: data.uomId,
                isActive: true,
                currentStock: 0,
                // Extended fields
                description: data.description || null,
                barcode: data.barcode || null,
                brand: data.brand || null,
                type: data.type || null,
                color: data.color || null,
                weight: data.weight || null,
                length: data.length || null,
                width: data.width || null,
                height: data.height || null,
                movementType: data.movementType || null,
                imagePath: data.imagePath || null,
                minStockLevel: data.minStockLevel || 0,
                maxStockLevel: data.maxStockLevel || 0,

                // Create VendorItem if vendor provided
                vendorSupplies: data.vendorId ? {
                    create: {
                        vendorId: data.vendorId,
                        cogsPerUom: data.price || 0,
                        isActive: true
                    }
                } : undefined
            },
            include: {
                category: true,
                uom: true,
                vendorSupplies: {
                    where: { isActive: true }
                }
            }
        });

        return { success: true, data: serializeDecimal(item) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
