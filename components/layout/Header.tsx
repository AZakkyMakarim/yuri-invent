'use client';

import { useState, useEffect } from 'react';

export default function Header() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return (
        <header className="h-16 flex items-center justify-end px-6 border-b border-(--color-border) bg-(--color-bg-primary)">
            <div className="h-5 w-48 bg-(--color-bg-tertiary) rounded animate-pulse"></div>
        </header>
    );

    const formattedTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(time).replace(/\./g, ':'); // Replace dots with colons for time if Indonesia locale uses dots

    return (
        <header className="h-16 flex items-center justify-end px-6 border-b border-(--color-border) bg-(--color-bg-primary) sticky top-0 z-30 transition-colors duration-300">
            <div className="text-sm font-medium text-(--color-text-secondary)">
                {formattedTime} WIB
            </div>
        </header>
    );
}
