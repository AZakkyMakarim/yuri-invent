import { getTranslations } from 'next-intl/server';
import {
    Package,
    AlertTriangle,
    ShoppingCart,
    ClipboardCheck,
} from 'lucide-react';
import { StatsCard, QuickActionCard, BudgetProgress } from '@/components/ui';

// Temporarily using mock data while connecting to database
const mockStats = {
    totalItems: 0,
    lowStockItems: 0,
    pendingPRs: 0,
    pendingVerifications: 0,
    budgetTotal: '0',
    budgetUsed: '0',
    budgetRemaining: '0',
};

export default async function DashboardPage() {
    const t = await getTranslations('dashboard');
    const stats = mockStats;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title={t('totalItems')}
                    value={stats.totalItems}
                    icon={Package}
                    iconColor="text-[var(--color-info)]"
                    iconBgColor="bg-[var(--color-info)]/10"
                />
                <StatsCard
                    title={t('lowStock')}
                    value={stats.lowStockItems}
                    icon={AlertTriangle}
                    iconColor="text-[var(--color-warning)]"
                    iconBgColor="bg-[var(--color-warning)]/10"
                    trend={
                        stats.lowStockItems > 0
                            ? { value: 'Requires attention', isPositive: false }
                            : undefined
                    }
                />
                <StatsCard
                    title={t('pendingPR')}
                    value={stats.pendingPRs}
                    icon={ShoppingCart}
                    iconColor="text-[var(--color-secondary)]"
                    iconBgColor="bg-[var(--color-secondary)]/10"
                />
                <StatsCard
                    title={t('pendingVerification')}
                    value={stats.pendingVerifications}
                    icon={ClipboardCheck}
                    iconColor="text-[var(--color-accent)]"
                    iconBgColor="bg-[var(--color-accent)]/10"
                />
            </div>

            {/* Budget Section */}
            <BudgetProgress
                title={t('budgetUsage')}
                totalBudget={stats.budgetTotal}
                usedBudget={stats.budgetUsed}
                remainingBudget={stats.budgetRemaining}
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionCard
                    href="/purchase"
                    icon={ShoppingCart}
                    label="New PR"
                />
                <QuickActionCard
                    href="/inbound"
                    icon={Package}
                    label="Receive Stock"
                />
                <QuickActionCard
                    href="/opname"
                    icon={ClipboardCheck}
                    label="Stock Opname"
                />
                <QuickActionCard
                    href="/master/items"
                    icon={Package}
                    label="Manage Items"
                />
            </div>
        </div>
    );
}
