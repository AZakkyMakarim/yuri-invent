'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
    value: string;
    label: string;
}

interface DropdownProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    searchable?: boolean;
    clearable?: boolean;
    error?: string;
    disabled?: boolean;
    className?: string;
}

export function Dropdown({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select...',
    searchable = false,
    clearable = false,
    error,
    disabled = false,
    className,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    const filteredOptions = searchable
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
        : options;

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={cn('w-full', className)} ref={containerRef}>
            {label && (
                <label className="label">{label}</label>
            )}
            <div className="relative">
                {/* Trigger Button */}
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={disabled}
                    className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-all',
                        'bg-(--color-bg-secondary) border',
                        isOpen
                            ? 'border-(--color-primary) ring-1 ring-(--color-primary)'
                            : 'border-(--color-border) hover:border-(--color-border-hover)',
                        error && 'border-(--color-danger)',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <span
                        className={cn(
                            'flex-1 truncate',
                            selectedOption
                                ? 'text-(--color-text-primary)'
                                : 'text-(--color-text-muted)'
                        )}
                    >
                        {selectedOption?.label || placeholder}
                    </span>
                    <div className="flex items-center gap-1">
                        {clearable && value && (
                            <div
                                role="button"
                                tabIndex={0}
                                onMouseDown={handleClear}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleClear(e as any);
                                    }
                                }}
                                className="p-0.5 rounded hover:bg-(--color-bg-hover) text-(--color-text-muted) cursor-pointer"
                            >
                                <X size={14} />
                            </div>
                        )}
                        <ChevronDown
                            size={16}
                            className={cn(
                                'text-(--color-text-muted) transition-transform',
                                isOpen && 'rotate-180'
                            )}
                        />
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 py-1 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg shadow-lg max-h-60 overflow-auto">
                        {/* Search Input */}
                        {searchable && (
                            <div className="px-2 pb-2 pt-1 border-b border-(--color-border)">
                                <div className="relative">
                                    <Search
                                        size={14}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
                                    />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-(--color-bg-tertiary) border border-(--color-border) rounded focus:border-(--color-primary) focus:outline-none text-(--color-text-primary)"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Options */}
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-(--color-text-muted)">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                                        option.value === value
                                            ? 'bg-(--color-primary)/10 text-(--color-primary)'
                                            : 'text-(--color-text-primary) hover:bg-(--color-bg-hover)'
                                    )}
                                >
                                    <span className="flex-1 truncate">{option.label}</span>
                                    {option.value === value && (
                                        <Check size={14} className="text-(--color-primary)" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-(--color-danger)">{error}</p>}
        </div>
    );
}
