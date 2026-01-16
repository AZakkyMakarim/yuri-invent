'use client';

import { Input } from './Input';
import { formatInputValue, parseFormattedNumber } from '@/lib/numberFormat';
import { useState, useEffect } from 'react';

interface FormattedNumberInputProps {
    value: number;
    onChange: (value: number) => void;
    decimals?: number;
    className?: string;
    placeholder?: string;
    min?: number;
    max?: number;
}

export function FormattedNumberInput({
    value,
    onChange,
    decimals = 0,
    className = '',
    placeholder = '0',
    min,
    max
}: FormattedNumberInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Update display value when props value changes (if not focused)
    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(value > 0 ? formatInputValue(value.toString(), decimals) : '');
        }
    }, [value, decimals, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow empty input
        if (inputValue === '') {
            setDisplayValue('');
            onChange(0);
            return;
        }

        // Format the input
        const formatted = formatInputValue(inputValue, decimals);
        setDisplayValue(formatted);

        // Parse and validate
        const numericValue = parseFormattedNumber(formatted);

        if (min !== undefined && numericValue < min) return;
        if (max !== undefined && numericValue > max) return;

        onChange(numericValue);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Reformat on blur to ensure clean display
        if (value > 0) {
            setDisplayValue(formatInputValue(value.toString(), decimals));
        }
    };

    return (
        <Input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
        />
    );
}
