'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const inputId = id || props.name;

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="label">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'input',
                        error && 'border-(--color-danger) focus:border-(--color-danger)',
                        className
                    )}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-(--color-danger)">{error}</p>}
                {hint && !error && (
                    <p className="mt-1 text-sm text-(--color-text-muted)">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

