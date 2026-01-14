'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface CreateUserData {
    email: string;
    password: string; // Temporary password
    name: string;
    roleId: string;
}

export async function createUser(data: CreateUserData) {
    if (!supabaseAdmin) {
        return { error: 'Server configuration error: Missing Service Role Key' };
    }

    try {
        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto convert to verified
            user_metadata: { name: data.name },
        });

        if (authError || !authData.user) {
            console.error('Supabase Auth Create Error:', authError);
            return { error: authError?.message || 'Failed to create authentication user' };
        }

        // 2. Create user in Prisma Database
        // Note: The triggers might handle this if you have them set up, but direct creation is safer 
        // if we want to ensure Role and Name are matched immediately.
        // If your system relies on Triggers from `auth.users`, we might have a race condition or conflict.
        // Assuming we are manually managing the `public.users` table as per the schema (User model).
        // The schema shows `User` model maps to `users` table.

        const user = await prisma.user.create({
            data: {
                supabaseId: authData.user.id,
                email: data.email,
                name: data.name,
                roleId: data.roleId,
                isActive: true, // Default active
            },
        });

        revalidatePath('/master/users');
        return { success: true, user };

    } catch (error) {
        console.error('Create User Action Error:', error);
        return { error: 'Internal server error during user creation' };
    }
}
