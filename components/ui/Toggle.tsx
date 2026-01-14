'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    description?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
    ({ className, label, description, id, checked, onChange, ...props }, ref) => {
        const toggleId = id || props.name || 'toggle';

        return (
            <label
                htmlFor={toggleId}
                className={cn('flex items-center gap-3 cursor-pointer', className)}
            >
                <div className="relative">
                    <input
                        type="checkbox"
                        id={toggleId}
                        ref={ref}
                        checked={checked}
                        onChange={onChange}
                        className="sr-only peer"
                        {...props}
                    />
                    <div
                        className={cn(
                            'w-11 h-6 rounded-full transition-colors',
                            'bg-(--color-bg-tertiary)',
                            'peer-checked:bg-(--color-primary)',
                            'peer-focus-visible:ring-2 peer-focus-visible:ring-(--color-primary) peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-(--color-bg-secondary)'
                        )}
                    />
                    <div
                        className={cn(
                            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform',
                            'bg-white shadow-sm',
                            'peer-checked:translate-x-5'
                        )}
                    />
                </div>
                {(label || description) && (
                    <div className="flex flex-col">
                        {label && <span className="font-medium text-sm">{label}</span>}
                        {description && (
                            <span className="text-xs text-(--color-text-muted)">{description}</span>
                        )}
                    </div>
                )}
            </label>
        );
    }
);

Toggle.displayName = 'Toggle';
