import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' },
            include: {
                permissions: true, // Include permissions for RBAC management
            }
        });
        return NextResponse.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}
