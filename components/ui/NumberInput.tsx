'use client';

import { forwardRef, InputHTMLAttributes, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
    label?: string;
    error?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    allowDecimal?: boolean;
}

// Format number with thousand separators (Indonesian format: 1.000.000)
const formatNumber = (num: number, allowDecimal: boolean): string => {
    if (num === 0) return '';

    const numStr = num.toString();
    const [intPart, decPart] = numStr.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (allowDecimal && decPart !== undefined) {
        return `${formattedInt},${decPart}`;
    }
    return formattedInt;
};

// Parse formatted string back to number
const parseFormattedNumber = (str: string): number => {
    if (!str || str === '') return 0;
    // Remove thousand separators (dots) and replace comma with dot for decimal
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({ className, label, error, value, onChange, min, max, allowDecimal = true, id, disabled, ...props }, ref) => {
        const inputId = id || props.name;
        const [displayValue, setDisplayValue] = useState(formatNumber(value, allowDecimal));

        // Sync display value when external value changes
        useEffect(() => {
            setDisplayValue(formatNumber(value, allowDecimal));
        }, [value, allowDecimal]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let input = e.target.value;

            // Allow empty input
            if (input === '') {
                setDisplayValue('');
                onChange(0);
                return;
            }

            // Remove any non-digit characters except dots and commas
            const cleanedInput = input.replace(/[^\d.,]/g, '');
            if (cleanedInput !== input) {
                input = cleanedInput;
            }

            // Prevent multiple commas
            if ((input.match(/,/g) || []).length > 1) return;

            // Prevent comma as first character (only allow after at least one digit)
            if (input.startsWith(',')) return;

            // If comma is in input but decimals not allowed, remove trailing comma part
            if (!allowDecimal && input.includes(',')) {
                const commaIndex = input.indexOf(',');
                input = input.substring(0, commaIndex);
            }

            // Store raw input for display (will be formatted on blur)
            setDisplayValue(input);

            // Parse and validate
            const numValue = parseFormattedNumber(input);

            if (max !== undefined && numValue > max) {
                onChange(max);
                return;
            }

            onChange(numValue);
        };

        const handleBlur = () => {
            // Format the display value on blur
            const numValue = parseFormattedNumber(displayValue);

            // Apply min constraint on blur
            let finalValue = numValue;
            if (min !== undefined && numValue < min) {
                finalValue = min;
            }

            setDisplayValue(formatNumber(finalValue, allowDecimal));
            onChange(finalValue);
        };

        return (
            <div className={cn('w-full', className)}>
                {label && (
                    <label htmlFor={inputId} className="label">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    type="text"
                    inputMode="decimal"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={disabled}
                    placeholder="0"
                    className={cn(
                        'w-full px-3 py-2.5 rounded-lg',
                        'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
                        'text-[var(--color-text-primary)] text-right font-medium',
                        'focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none',
                        'transition-all',
                        'placeholder:text-[var(--color-text-muted)]',
                        error && 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-[var(--color-danger)]">{error}</p>}
            </div>
        );
    }
);

NumberInput.displayName = 'NumberInput';
