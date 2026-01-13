'use client';

import { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextFilter } from './filters/TextFilter';
import { MultiSelectFilter } from './filters/MultiSelectFilter';
import { DateRangeFilter } from './filters/DateRangeFilter';

export type SortDirection = 'asc' | 'desc' | null;

type FilterType = 'text' | 'multiselect' | 'date' | 'none';

interface FilterableTableHeadProps {
    children: ReactNode;
    className?: string;
    // Sorting
    sortable?: boolean;
    sortDirection?: SortDirection;
    onSort?: () => void;
    // Filter type
    filterType?: FilterType;
    // Text filter
    textValue?: string;
    onTextChange?: (value: string) => void;
    textPlaceholder?: string;
    // Multi-select filter
    selectOptions?: string[];
    selectedValues?: string[];
    onSelectChange?: (selected: string[]) => void;
    selectPlaceholder?: string;
    // Date range filter
    startDate?: string;
    endDate?: string;
    onDateChange?: (start: string, end: string) => void;
    datePlaceholder?: string;
}

export function FilterableTableHead({
    children,
    className,
    sortable = false,
    sortDirection,
    onSort,
    filterType = 'none',
    textValue = '',
    onTextChange,
    textPlaceholder = 'Filter...',
    selectOptions = [],
    selectedValues = [],
    onSelectChange,
    selectPlaceholder = 'All',
    startDate = '',
    endDate = '',
    onDateChange,
    datePlaceholder = 'Any date',
}: FilterableTableHeadProps) {
    const hasFilter = filterType !== 'none';

    return (
        <th className={cn('align-top p-0', className)}>
            <div className="px-3 py-2">
                {/* Column Header Row */}
                <div className="flex items-center gap-2 h-6">
                    <span className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        {children}
                    </span>
                    {sortable && onSort && (
                        <button
                            onClick={onSort}
                            className={cn(
                                'p-0.5 rounded hover:bg-[var(--color-bg-hover)] flex-shrink-0',
                                sortDirection ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                            )}
                        >
                            {sortDirection === 'asc' && <ArrowUp size={12} />}
                            {sortDirection === 'desc' && <ArrowDown size={12} />}
                            {!sortDirection && <ArrowUpDown size={12} />}
                        </button>
                    )}
                </div>

                {/* Filter Row - consistent height */}
                <div className={cn('mt-1.5', hasFilter ? 'h-7' : 'h-7')}>
                    {filterType === 'text' && onTextChange && (
                        <TextFilter
                            value={textValue}
                            onChange={onTextChange}
                            placeholder={textPlaceholder}
                        />
                    )}

                    {filterType === 'multiselect' && onSelectChange && (
                        <MultiSelectFilter
                            options={selectOptions}
                            selected={selectedValues}
                            onChange={onSelectChange}
                            placeholder={selectPlaceholder}
                        />
                    )}

                    {filterType === 'date' && onDateChange && (
                        <DateRangeFilter
                            startDate={startDate}
                            endDate={endDate}
                            onChange={onDateChange}
                            placeholder={datePlaceholder}
                        />
                    )}
                </div>
            </div>
        </th>
    );
}
