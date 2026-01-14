'use client';

import { useLoading } from '@/contexts/LoadingContext';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
    const { isLoading } = useLoading();

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-[var(--color-border)]">
                <Loader2 size={40} className="text-[var(--color-primary)] animate-spin" />
                <p className="text-[var(--color-text-primary)] font-medium">Loading...</p>
            </div>
        </div>
    );
}
