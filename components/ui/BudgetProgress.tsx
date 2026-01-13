import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface BudgetProgressProps {
    title: string;
    totalBudget: string | number;
    usedBudget: string | number;
    remainingBudget: string | number;
    labels?: {
        total: string;
        used: string;
        remaining: string;
    };
    className?: string;
}

export function BudgetProgress({
    title,
    totalBudget,
    usedBudget,
    remainingBudget,
    labels = {
        total: 'Total Budget',
        used: 'Used',
        remaining: 'Remaining',
    },
    className,
}: BudgetProgressProps) {
    const total = typeof totalBudget === 'string' ? parseFloat(totalBudget) : totalBudget;
    const used = typeof usedBudget === 'string' ? parseFloat(usedBudget) : usedBudget;

    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

    const progressColor =
        percentage > 80
            ? 'bg-[var(--color-danger)]'
            : percentage > 60
                ? 'bg-[var(--color-warning)]'
                : 'bg-[var(--color-success)]';

    return (
        <div className={cn('card', className)}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{title}</h2>
                <div className="flex items-center gap-2">
                    <TrendingUp size={20} className="text-[var(--color-success)]" />
                    <span className="text-sm font-medium">{percentage}% used</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-4 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-500', progressColor)}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-xs text-[var(--color-text-muted)]">{labels.total}</p>
                    <p className="font-semibold">{formatCurrency(totalBudget)}</p>
                </div>
                <div>
                    <p className="text-xs text-[var(--color-text-muted)]">{labels.used}</p>
                    <p className="font-semibold text-[var(--color-warning)]">
                        {formatCurrency(usedBudget)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[var(--color-text-muted)]">{labels.remaining}</p>
                    <p className="font-semibold text-[var(--color-success)]">
                        {formatCurrency(remainingBudget)}
                    </p>
                </div>
            </div>
        </div>
    );
}
