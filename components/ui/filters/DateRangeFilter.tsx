'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
    placeholder?: string;
    className?: string;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getMonthDays(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    return days;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function DateRangeFilter({
    startDate,
    endDate,
    onChange,
    placeholder = 'Any date',
    className,
}: DateRangeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectingStart, setSelectingStart] = useState(true);
    const [viewDate, setViewDate] = useState(() => {
        const start = parseDate(startDate);
        return start || new Date();
    });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasValue = startDate || endDate;

    const clearDates = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('', '');
    };

    // Format display value
    const formatDisplayDate = (date: string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    let displayValue = placeholder;
    if (startDate && endDate) {
        displayValue = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    } else if (startDate) {
        displayValue = `From ${formatDisplayDate(startDate)}`;
    } else if (endDate) {
        displayValue = `Until ${formatDisplayDate(endDate)}`;
    }

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const selectedDate = formatDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));

        if (selectingStart) {
            // Clear end date if new start is after current end
            const newEnd = endDate && selectedDate > endDate ? '' : endDate;
            onChange(selectedDate, newEnd);
            setSelectingStart(false);
        } else {
            // If selected date is before start, make it the new start
            if (startDate && selectedDate < startDate) {
                onChange(selectedDate, startDate);
            } else {
                onChange(startDate, selectedDate);
            }
            setSelectingStart(true);
            setIsOpen(false);
        }
    };

    const isInRange = (day: number) => {
        if (!startDate || !endDate) return false;
        const date = formatDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
        return date > startDate && date < endDate;
    };

    const isStart = (day: number) => {
        if (!startDate) return false;
        const date = formatDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
        return date === startDate;
    };

    const isEnd = (day: number) => {
        if (!endDate) return false;
        const date = formatDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
        return date === endDate;
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            viewDate.getMonth() === today.getMonth() &&
            viewDate.getFullYear() === today.getFullYear()
        );
    };

    const days = getMonthDays(viewDate.getFullYear(), viewDate.getMonth());

    return (
        <div ref={dropdownRef} className={cn('relative h-9', className)}>
            {/* Trigger Field */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full h-full flex items-center gap-2 px-3 text-sm rounded-lg border transition-colors',
                    'bg-(--color-bg-tertiary) border-(--color-border)',
                    'hover:border-(--color-border-hover)',
                    hasValue && 'border-(--color-primary)/50 bg-(--color-primary)/5'
                )}
            >
                <Calendar size={14} className="shrink-0 text-(--color-text-muted)" />
                <span className={cn(
                    'flex-1 text-left truncate',
                    hasValue ? 'text-(--color-text-primary)' : 'text-(--color-text-muted)'
                )}>
                    {displayValue}
                </span>
                {hasValue && (
                    <X
                        size={14}
                        onClick={clearDates}
                        className="shrink-0 text-(--color-text-muted) hover:text-(--color-danger)"
                    />
                )}
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg shadow-lg p-3 animate-fadeIn w-[280px]">
                    {/* Selection Indicator */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setSelectingStart(true)}
                            className={cn(
                                'flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors',
                                selectingStart
                                    ? 'bg-(--color-primary) border-(--color-primary) text-white'
                                    : 'border-(--color-border) text-(--color-text-secondary)'
                            )}
                        >
                            Start: {startDate ? formatDisplayDate(startDate) : 'Select'}
                        </button>
                        <button
                            onClick={() => setSelectingStart(false)}
                            className={cn(
                                'flex-1 py-1.5 px-2 text-xs rounded-md border transition-colors',
                                !selectingStart
                                    ? 'bg-(--color-primary) border-(--color-primary) text-white'
                                    : 'border-(--color-border) text-(--color-text-secondary)'
                            )}
                        >
                            End: {endDate ? formatDisplayDate(endDate) : 'Select'}
                        </button>
                    </div>

                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1.5 rounded-md hover:bg-(--color-bg-hover) text-(--color-text-secondary)"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-medium text-sm text-(--color-text-primary)">
                            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-1.5 rounded-md hover:bg-(--color-bg-hover) text-(--color-text-secondary)"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="text-center text-xs font-medium text-(--color-text-muted) py-1"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => (
                            <div key={index} className="aspect-square">
                                {day !== null ? (
                                    <button
                                        onClick={() => handleDayClick(day)}
                                        className={cn(
                                            'w-full h-full flex items-center justify-center text-xs rounded-md transition-colors',
                                            isStart(day) && 'bg-(--color-primary) text-white',
                                            isEnd(day) && 'bg-(--color-primary) text-white',
                                            isInRange(day) && 'bg-(--color-primary)/20 text-(--color-text-primary)',
                                            !isStart(day) && !isEnd(day) && !isInRange(day) && 'hover:bg-(--color-bg-hover) text-(--color-text-primary)',
                                            isToday(day) && !isStart(day) && !isEnd(day) && 'ring-1 ring-(--color-primary) ring-inset'
                                        )}
                                    >
                                        {day}
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-(--color-border)">
                        <button
                            onClick={() => {
                                const today = new Date();
                                const weekAgo = new Date(today);
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                onChange(formatDate(weekAgo), formatDate(today));
                                setIsOpen(false);
                            }}
                            className="flex-1 py-1.5 text-xs rounded-md bg-(--color-bg-tertiary) hover:bg-(--color-bg-hover) text-(--color-text-secondary)"
                        >
                            Last 7 days
                        </button>
                        <button
                            onClick={() => {
                                const today = new Date();
                                const monthAgo = new Date(today);
                                monthAgo.setMonth(monthAgo.getMonth() - 1);
                                onChange(formatDate(monthAgo), formatDate(today));
                                setIsOpen(false);
                            }}
                            className="flex-1 py-1.5 text-xs rounded-md bg-(--color-bg-tertiary) hover:bg-(--color-bg-hover) text-(--color-text-secondary)"
                        >
                            Last 30 days
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
