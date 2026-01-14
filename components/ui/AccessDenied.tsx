'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mb-6">
                <ShieldAlert size={32} className="text-[var(--color-danger)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                Access Denied
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
                You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.
            </p>
            <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors font-medium shadow-sm hover:shadow-md"
            >
                Back to Dashboard
            </Link>
        </div>
    );
}
