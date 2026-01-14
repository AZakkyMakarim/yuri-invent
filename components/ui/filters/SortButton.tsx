'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortButtonProps {
    direction: SortDirection;
    onSort: () => void;
    className?: string;
}

export function SortButton({ direction, onSort, className }: SortButtonProps) {
    return (
        <button
            onClick={onSort}
            className={cn(
                'p-1 rounded hover:bg-(--color-bg-hover)',
                direction ? 'text-(--color-primary)' : 'text-(--color-text-muted)',
                className
            )}
        >
            {direction === 'asc' && <ArrowUp size={14} />}
            {direction === 'desc' && <ArrowDown size={14} />}
            {!direction && <ArrowUpDown size={14} />}
        </button>
    );
}
