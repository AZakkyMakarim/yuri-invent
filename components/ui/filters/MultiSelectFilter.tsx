'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectFilterProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    searchable?: boolean;
}

export function MultiSelectFilter({
    options,
    selected,
    onChange,
    placeholder = 'All',
    className,
    searchable = true,
}: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter((s) => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const filteredOptions = search
        ? options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()))
        : options;

    const displayValue = selected.length > 0
        ? selected.length === 1
            ? selected[0]
            : `${selected.length} selected`
        : placeholder;
    const hasSelection = selected.length > 0;

    return (
        <div ref={dropdownRef} className={cn('relative h-9', className)}>
            {/* Trigger Field */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full h-full flex items-center gap-1 px-3 text-sm rounded-lg border transition-colors',
                    'bg-(--color-bg-tertiary) border-(--color-border)',
                    'hover:border-(--color-border-hover)',
                    hasSelection && 'border-(--color-primary)/50 bg-(--color-primary)/5'
                )}
            >
                <span className={cn(
                    'flex-1 text-left truncate',
                    hasSelection ? 'text-(--color-text-primary)' : 'text-(--color-text-muted)'
                )}>
                    {displayValue}
                </span>
                {hasSelection ? (
                    <X
                        size={14}
                        onClick={clearAll}
                        className="shrink-0 text-(--color-text-muted) hover:text-(--color-danger)"
                    />
                ) : (
                    <ChevronDown size={14} className="shrink-0 text-(--color-text-muted)" />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 min-w-[180px] bg-(--color-bg-secondary) border border-(--color-border) rounded-lg shadow-lg py-1 animate-fadeIn">
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
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-(--color-text-muted)">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => toggleOption(option)}
                                    className="w-full px-3 py-2 text-sm text-left hover:bg-(--color-bg-hover) flex items-center gap-2"
                                >
                                    <div
                                        className={cn(
                                            'w-4 h-4 border rounded flex items-center justify-center shrink-0',
                                            selected.includes(option)
                                                ? 'bg-(--color-primary) border-(--color-primary)'
                                                : 'border-(--color-border)'
                                        )}
                                    >
                                        {selected.includes(option) && (
                                            <Check size={12} className="text-white" />
                                        )}
                                    </div>
                                    <span className="truncate">{option}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
