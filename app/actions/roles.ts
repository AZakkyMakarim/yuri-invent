'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateRolePermissions(roleId: string, permissionIds: string[]) {
    if (!roleId) return { error: 'Role ID is required' };

    try {
        // Use Prisma's `set` to replace all existing connections with the new list
        // This handles both adding new ones and removing unchecked ones
        await prisma.role.update({
            where: { id: roleId },
            data: {
                permissions: {
                    set: permissionIds.map(id => ({ id })),
                },
            },
        });

        revalidatePath('/master/users');
        return { success: true };
    } catch (error) {
        console.error('Update Role Permissions Error:', error);
        return { error: 'Failed to update role permissions' };
    }
}

export async function createRole(name: string, description: string) {
    if (!name) return { error: 'Role name is required' };

    try {
        const existingRoles = await prisma.role.findMany({ where: { name } });
        if (existingRoles.length > 0) return { error: 'Role name already exists' };

        await prisma.role.create({
            data: {
                name,
                description,
            },
        });

        revalidatePath('/master/users');
        return { success: true };
    } catch (error) {
        console.error('Create Role Error:', error);
        return { error: 'Failed to create role' };
    }
}
