import Link from 'next/link';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
    href: string;
    icon: LucideIcon;
    label: string;
    className?: string;
}

export function QuickActionCard({
    href,
    icon: Icon,
    label,
    className,
}: QuickActionCardProps) {
    return (
        <Link
            href={href}
            className={cn(
                'card hover:border-[var(--color-primary)] transition-colors group flex items-center',
                className
            )}
        >
            <div className="flex items-center gap-3">
                <Icon
                    size={20}
                    className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]"
                />
                <span className="font-medium">{label}</span>
            </div>
            <ArrowUpRight
                size={16}
                className="ml-auto text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]"
            />
        </Link>
    );
}
