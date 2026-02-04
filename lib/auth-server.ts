import { createClient } from './supabase-server';
import { getUserProfile } from '@/app/actions/auth';
import { AuthUser } from './auth-types';

/**
 * Get the current user from Supabase Auth (Server Side)
 */
export async function getCurrentSupabaseUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        return null;
    }

    return user;
}

/**
 * Get the complete authenticated user (Supabase + Database profile) (Server Side)
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    try {
        const supabaseUser = await getCurrentSupabaseUser();

        if (!supabaseUser) {
            console.log('[Auth] No Supabase user found in session');
            return null;
        }

        console.log('[Auth] Supabase User ID:', supabaseUser.id);

        const profile = await getUserProfile(supabaseUser.id);

        if (!profile) {
            console.log('[Auth] No profile found for Supabase ID:', supabaseUser.id);
            return null;
        }

        if (!profile.isActive) {
            console.log('[Auth] Profile is inactive:', profile.id);
            return null;
        }

        return profile;
    } catch (error) {
        console.error('Error getting authenticated user:', error);
        return null;
    }
}
