'use client';

import { ReactNode, useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableFiltersProps {
    children: ReactNode;
    className?: string;
    onApply: () => void;
    onReset: () => void;
    hasActiveFilters?: boolean;
}

export function TableFilters({
    children,
    className,
    onApply,
    onReset,
    hasActiveFilters = false,
}: TableFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleApply = () => {
        onApply();
        setIsExpanded(false);
    };

    return (
        <div className={cn('mb-4', className)}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    'border border-[var(--color-border)]',
                    hasActiveFilters
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                )}
            >
                <Filter size={14} />
                <span>Filters</span>
                {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                )}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Filter Panel */}
            {isExpanded && (
                <div className="mt-2 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg animate-fadeIn">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {children}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                        <button
                            onClick={handleApply}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                            )}
                        >
                            <Search size={14} />
                            Apply Filters
                        </button>
                        <button
                            onClick={onReset}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
                                'border border-[var(--color-border)]'
                            )}
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface FilterFieldProps {
    label: string;
    children: ReactNode;
    className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
    return (
        <div className={cn('w-full', className)}>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5 font-medium uppercase tracking-wider">
                {label}
            </label>
            {children}
        </div>
    );
}
