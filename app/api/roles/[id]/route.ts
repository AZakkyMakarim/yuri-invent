import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if role exists and if it's a system role
        const role = await prisma.role.findUnique({
            where: { id }
        });

        if (!role) {
            return NextResponse.json(
                { success: false, error: 'Role not found' },
                { status: 404 }
            );
        }

        if (role.isSystem) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete system role' },
                { status: 403 }
            );
        }

        // Delete the role (cascade will delete role permissions)
        await prisma.role.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: `Role "${role.name}" deleted successfully`
        });

    } catch (error: any) {
        console.error('Error deleting role:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete role' },
            { status: 500 }
        );
    }
}
