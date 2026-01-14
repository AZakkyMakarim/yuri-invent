'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, getAuthenticatedUser, onAuthStateChange } from '@/lib/auth';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load initial user
        loadUser();

        // Listen to auth changes
        const { data: { subscription } } = onAuthStateChange((authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    async function loadUser() {
        try {
            const authUser = await getAuthenticatedUser();
            setUser(authUser);
        } catch (error) {
            console.error('Error loading user:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        const { signOut } = await import('@/lib/auth');
        await signOut();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
