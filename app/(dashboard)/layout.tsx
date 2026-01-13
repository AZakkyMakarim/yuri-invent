import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="lg:ml-[var(--sidebar-width)] min-h-screen p-6 pt-20 lg:pt-6">
                {children}
            </main>
        </div>
    );
}
