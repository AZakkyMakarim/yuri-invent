import { supabase } from './supabase';
import { getUserProfile } from '@/app/actions/auth';
import { AuthUser } from './auth-types';

export type { AuthUser };

/**
 * Sign in with email and password using Supabase Auth
 */
export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error(error.message);
    }
}

/**
 * Get the current session
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message);
    }

    return session;
}

/**
 * Get the current user from Supabase Auth
 */
export async function getCurrentSupabaseUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        throw new Error(error.message);
    }

    return user;
}

// getUserProfile logic moved to server action @/app/actions/auth
export { getUserProfile };

/**
 * Get the complete authenticated user (Supabase + Database profile)
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    try {
        const supabaseUser = await getCurrentSupabaseUser();

        if (!supabaseUser) {
            return null;
        }

        const profile = await getUserProfile(supabaseUser.id);

        if (!profile || !profile.isActive) {
            return null;
        }

        return profile;
    } catch (error) {
        console.error('Error getting authenticated user:', error);
        return null;
    }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            callback(profile);
        } else {
            callback(null);
        }
    });
}
