import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [
                { module: 'asc' },
                { name: 'asc' },
            ],
        });
        return NextResponse.json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }
}
