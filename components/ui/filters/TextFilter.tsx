'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextFilterProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function TextFilter({
    value,
    onChange,
    placeholder = 'Filter...',
    className,
}: TextFilterProps) {
    const hasValue = value.length > 0;

    return (
        <div className={cn('relative h-9', className)}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    'w-full h-full px-3 text-sm rounded-lg border transition-colors',
                    'bg-[var(--color-bg-tertiary)] border-[var(--color-border)]',
                    'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                    'focus:outline-none focus:border-[var(--color-primary)]',
                    hasValue && 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5 pr-8'
                )}
            />
            {hasValue && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
