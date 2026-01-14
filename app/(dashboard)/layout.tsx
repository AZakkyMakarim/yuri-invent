'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { routePermissions } from '@/lib/route-permissions';
import AccessDenied from '@/components/ui/AccessDenied';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState<boolean>(true);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/sign-in');
            return;
        }

        // Check Permissions
        const requiredPermission = routePermissions[pathname];

        if (requiredPermission && user.role?.permissions) {
            const hasPermission = user.role.permissions.some(p => p.module === requiredPermission);
            setIsAuthorized(hasPermission);
        } else {
            setIsAuthorized(true);
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-(--color-bg-primary)">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-(--color-primary) border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-(--color-text-muted)">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary) transition-colors duration-300">
            <Sidebar />
            <div className="lg:ml-(--sidebar-width) min-h-screen flex flex-col transition-[margin] duration-300">
                <Header />
                <main className="flex-1 p-6">
                    {isAuthorized ? children : <AccessDenied />}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <DashboardContent>{children}</DashboardContent>
        </AuthProvider>
    );
}
