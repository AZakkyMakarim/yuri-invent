'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Table Root
interface TableProps {
    children: ReactNode;
    className?: string;
}

export function Table({ children, className }: TableProps) {
    return (
        <div className={cn('table-container', className)}>
            <table className="table">{children}</table>
        </div>
    );
}

// Table Header
interface TableHeaderProps {
    children: ReactNode;
    className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
    return <thead className={cn(className)}>{children}</thead>;
}

// Table Body
interface TableBodyProps {
    children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
    return <tbody>{children}</tbody>;
}

// Table Row
interface TableRowProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
    return (
        <tr
            className={cn(onClick && 'cursor-pointer', className)}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

// Table Head Cell
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    children: ReactNode;
    className?: string;
}

export function TableHead({ children, className, ...props }: TableHeadProps) {
    return <th className={cn(className)} {...props}>{children}</th>;
}

// Table Cell
interface TableCellProps {
    children: ReactNode;
    className?: string;
    colSpan?: number;
}

export function TableCell({ children, className, colSpan }: TableCellProps) {
    return <td className={cn(className)} colSpan={colSpan}>{children}</td>;
}

// Empty State
interface TableEmptyProps {
    message?: string;
    colSpan: number;
}

export function TableEmpty({ message = 'No data available', colSpan }: TableEmptyProps) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className="py-12 text-center text-(--color-text-muted)"
            >
                {message}
            </td>
        </tr>
    );
}
