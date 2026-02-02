import React from 'react';

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div className="relative z-10 max-h-[90vh] overflow-y-auto">
                {children}
            </div>
        </div>
    );
}

interface DialogContentProps {
    children: React.ReactNode;
}

export function DialogContent({ children }: DialogContentProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-transparent dark:border-slate-700">
            {children}
        </div>
    );
}

interface DialogHeaderProps {
    children: React.ReactNode;
}

export function DialogHeader({ children }: DialogHeaderProps) {
    return (
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
            {children}
        </div>
    );
}

interface DialogTitleProps {
    children: React.ReactNode;
}

export function DialogTitle({ children }: DialogTitleProps) {
    return (
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {children}
        </h2>
    );
}
