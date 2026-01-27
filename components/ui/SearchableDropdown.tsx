'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export type SearchableDropdownOption = {
    value: string;
    label: string;
    subtitle?: string;
};

type SearchableDropdownProps = {
    options: SearchableDropdownOption[];
    value: string | string[]; // Support both single and multiple
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onAddNew?: () => void; // Optional callback for "Add New" button
    addNewLabel?: string;  // Custom label for "Add New" button
    multiple?: boolean; // Enable multi-select mode
};

export default function SearchableDropdown({
    options,
    value,
    onChange,
    placeholder = 'Select an option...',
    className = '',
    disabled = false,
    multiple = false,
    onAddNew,
    addNewLabel = 'Add New'
}: SearchableDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Normalize value to always be an array internally
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    // Filter options based on search query
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (option.subtitle && option.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Get the selected option(s)
    const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus search input when dropdown opens
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        if (multiple) {
            // Multi-select mode
            const newValues = selectedValues.includes(optionValue)
                ? selectedValues.filter(v => v !== optionValue)
                : [...selectedValues, optionValue];
            onChange(newValues);
        } else {
            // Single-select mode
            onChange(optionValue);
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(multiple ? [] : '');
        setSearchQuery('');
    };

    const isSelected = (optionValue: string) => selectedValues.includes(optionValue);

    // Display text for the trigger button
    const getDisplayText = () => {
        if (selectedOptions.length === 0) {
            return <span className="text-(--color-text-muted)">{placeholder}</span>;
        }

        if (multiple) {
            if (selectedOptions.length === 1) {
                return selectedOptions[0].label;
            }
            return `${selectedOptions.length} selected`;
        }

        return selectedOptions[0].label;
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-3 py-2 rounded-lg border-2 bg-(--color-bg-tertiary) text-left flex items-center justify-between gap-2 transition-all outline-none
                    ${disabled
                        ? 'opacity-50 cursor-not-allowed border-(--color-border)'
                        : isOpen
                            ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/30'
                            : 'border-(--color-border) hover:border-indigo-300 dark:hover:border-indigo-700'
                    }
                `}
            >
                <span className="flex-1 truncate font-medium">
                    {getDisplayText()}
                </span>
                <div className="flex items-center gap-1">
                    {selectedValues.length > 0 && !disabled && (
                        <X
                            size={16}
                            className="text-(--color-text-muted) hover:text-red-500 transition-colors"
                            onClick={handleClear}
                        />
                    )}
                    <ChevronDown
                        size={18}
                        className={`text-(--color-text-secondary) transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-(--color-bg-card) border-2 border-indigo-300 dark:border-indigo-700 rounded-lg shadow-2xl overflow-hidden animate-fadeIn">
                    {/* Search Input */}
                    <div className="p-2 border-b border-(--color-border) bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={16} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-9 pr-3 py-2 rounded-md border border-(--color-border) bg-white dark:bg-(--color-bg-tertiary) focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-8 text-center text-(--color-text-muted) text-sm">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const selected = isSelected(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full px-4 py-2.5 text-left hover:bg-linear-to-r hover:from-indigo-50/50 hover:to-transparent dark:hover:from-indigo-950/20 transition-colors border-b border-(--color-border) last:border-b-0 flex items-center gap-3
                                            ${selected ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''}
                                        `}
                                    >
                                        {multiple && (
                                            <div className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                                                ${selected
                                                    ? 'bg-indigo-500 border-indigo-500'
                                                    : 'border-(--color-border)'
                                                }`}
                                            >
                                                {selected && <Check size={12} className="text-white" />}
                                            </div>
                                        )}
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <span className="font-medium truncate">{option.label}</span>
                                            {option.subtitle && (
                                                <span className="text-xs text-(--color-text-muted) mt-0.5 truncate">{option.subtitle}</span>
                                            )}
                                        </div>
                                        {!multiple && selected && (
                                            <Check size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Actions */}
                    {(onAddNew || (multiple && selectedValues.length > 0)) && (
                        <div className="flex flex-col border-t border-(--color-border)">
                            {onAddNew && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onAddNew();
                                    }}
                                    className="w-full px-4 py-3 text-left bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b border-(--color-border) last:border-b-0"
                                >
                                    <PlusIcon size={16} />
                                    {addNewLabel}
                                </button>
                            )}

                            {multiple && selectedValues.length > 0 && (
                                <div className="p-2 bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
                                    <div className="text-xs text-(--color-text-secondary) font-medium text-center">
                                        {selectedValues.length} item{selectedValues.length !== 1 ? 's' : ''} selected
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper icon
function PlusIcon({ size = 16, className = '' }: { size?: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}
