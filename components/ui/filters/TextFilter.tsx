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
                    'bg-(--color-bg-tertiary) border-(--color-border)',
                    'text-(--color-text-primary) placeholder:text-(--color-text-muted)',
                    'focus:outline-none focus:border-(--color-primary)',
                    hasValue && 'border-(--color-primary)/50 bg-(--color-primary)/5 pr-8'
                )}
            />
            {hasValue && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted) hover:text-(--color-danger)"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
