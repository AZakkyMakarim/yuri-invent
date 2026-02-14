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

/**
 * Sync Supabase connection with local User table
 * Call this after successful login to ensure Profile exists
 */
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function syncUserProfile() {
    try {
        const cookieStore = await cookies();

        // Create Supabase client
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        // We don't need to set cookies in this action, just read
                    }
                }
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        // Check if exists
        const existing = await prisma.user.findUnique({
            where: { supabaseId: user.id }
        });

        if (existing) return { success: true };

        // Create missing profile
        console.log(`Creating missing profile for ${user.email}`);

        // Check if first user -> Super Admin
        const userCount = await prisma.user.count();
        let roleId = null;

        if (userCount === 0) {
            const adminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
            roleId = adminRole?.id;
        } else {
            // Default role or null
            // Let's try to assign a default staff role if available
            //  const staffRole = await prisma.role.findFirst({ where: { name: { contains: 'Staff' } } });
            //  roleId = staffRole?.id;
        }

        await prisma.user.create({
            data: {
                supabaseId: user.id,
                email: user.email!,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                roleId: roleId,
                isActive: true
            }
        });

        return { success: true, created: true };

    } catch (error: any) {
        console.error('Detailed sync error:', error);
        return { success: false, error: error.message };
    }
}
