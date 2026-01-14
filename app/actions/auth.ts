'use server';

import { prisma } from '@/lib/prisma';
import { AuthUser } from '@/lib/auth-types';

/**
 * Get user profile with role and permissions from database
 */
export async function getUserProfile(supabaseId: string): Promise<AuthUser | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { supabaseId },
            include: {
                role: {
                    include: {
                        permissions: true,
                    },
                },
            },
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            supabaseId: user.supabaseId,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
            role: user.role,
            isActive: user.isActive,
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}
