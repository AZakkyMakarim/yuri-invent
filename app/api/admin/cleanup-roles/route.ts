import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        // Get all roles
        const roles = await prisma.role.findMany({
            select: { id: true, name: true }
        });

        // Find roles to keep and delete
        const rolesToKeep = roles.filter(r =>
            r.name === 'Super Admin' || r.name === 'Head Invent'
        );
        const rolesToDelete = roles.filter(r =>
            r.name !== 'Super Admin' && r.name !== 'Head Invent'
        );

        // Delete other roles
        for (const role of rolesToDelete) {
            await prisma.role.delete({ where: { id: role.id } });
        }

        // Get all permissions
        const allPermissions = await prisma.permission.findMany();

        // Find Super Admin
        const superAdmin = rolesToKeep.find(r => r.name === 'Super Admin');

        if (superAdmin) {
            // Assign all permissions (clears implicit and sets new)
            await prisma.role.update({
                where: { id: superAdmin.id },
                data: {
                    permissions: {
                        set: allPermissions.map(p => ({ id: p.id }))
                    }
                }
            });
        }

        return NextResponse.json({
            success: true,
            deletedRoles: rolesToDelete.map(r => r.name),
            keptRoles: rolesToKeep.map(r => r.name),
            permissionsAssigned: allPermissions.length
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
