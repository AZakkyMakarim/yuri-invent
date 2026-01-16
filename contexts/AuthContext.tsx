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

    const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

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

    // Inactivity Check
    useEffect(() => {
        if (!user) return; // Only track when logged in

        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('User inactive for 6 hours, logging out...');
                handleSignOut();
            }, INACTIVITY_TIMEOUT);
        };

        // Events to monitor
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user]);

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
