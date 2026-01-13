import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    className?: string;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    iconColor = 'text-[var(--color-info)]',
    iconBgColor = 'bg-[var(--color-info)]/10',
    trend,
    className,
}: StatsCardProps) {
    return (
        <div className={cn('card', className)}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgColor)}>
                    <Icon className={iconColor} size={24} />
                </div>
            </div>
            {trend && (
                <div
                    className={cn(
                        'mt-3 flex items-center gap-1 text-sm',
                        trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
                    )}
                >
                    <span>{trend.value}</span>
                </div>
            )}
        </div>
    );
}
