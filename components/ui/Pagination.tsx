'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    className,
}: PaginationProps) {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            if (currentPage > 3) pages.push('ellipsis');

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push('ellipsis');

            pages.push(totalPages);
        }

        return pages;
    };

    // Don't show anything if no items
    if (totalItems === 0) return null;

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-4 mt-4 px-2',
                className
            )}
        >
            {/* Info */}
            <p className="text-sm text-(--color-text-secondary)">
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
            </p>

            {/* Controls - only show when more than 1 page */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            currentPage === 1
                                ? 'text-(--color-text-muted) cursor-not-allowed'
                                : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                        )}
                    >
                        <ChevronsLeft size={16} />
                    </button>

                    {/* Previous */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            currentPage === 1
                                ? 'text-(--color-text-muted) cursor-not-allowed'
                                : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                        )}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 mx-1">
                        {getPageNumbers().map((page, index) =>
                            page === 'ellipsis' ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-2 text-(--color-text-muted)"
                                >
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={cn(
                                        'min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors',
                                        page === currentPage
                                            ? 'bg-(--color-primary) text-white'
                                            : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                                    )}
                                >
                                    {page}
                                </button>
                            )
                        )}
                    </div>

                    {/* Next */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            currentPage === totalPages
                                ? 'text-(--color-text-muted) cursor-not-allowed'
                                : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                        )}
                    >
                        <ChevronRight size={16} />
                    </button>

                    {/* Last Page */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            currentPage === totalPages
                                ? 'text-(--color-text-muted) cursor-not-allowed'
                                : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                        )}
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
