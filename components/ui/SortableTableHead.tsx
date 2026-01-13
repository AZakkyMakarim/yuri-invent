'use client';

import { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeadProps {
    children: ReactNode;
    className?: string;
    sortable?: boolean;
    sortDirection?: SortDirection;
    onSort?: () => void;
}

export function SortableTableHead({
    children,
    className,
    sortable = false,
    sortDirection,
    onSort,
}: SortableTableHeadProps) {
    return (
        <th className={cn('whitespace-nowrap', className)}>
            {sortable && onSort ? (
                <button
                    onClick={onSort}
                    className={cn(
                        'flex items-center gap-1.5 w-full text-left transition-colors',
                        'hover:text-[var(--color-text-primary)]',
                        sortDirection ? 'text-[var(--color-primary)]' : ''
                    )}
                >
                    <span>{children}</span>
                    <span className="flex-shrink-0">
                        {sortDirection === 'asc' && <ArrowUp size={12} />}
                        {sortDirection === 'desc' && <ArrowDown size={12} />}
                        {!sortDirection && <ArrowUpDown size={12} className="opacity-40" />}
                    </span>
                </button>
            ) : (
                <span>{children}</span>
            )}
        </th>
    );
}
