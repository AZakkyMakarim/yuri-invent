'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    children: (activeTab: string) => React.ReactNode;
    className?: string;
    // Controlled mode props (optional)
    activeTab?: string;
    onChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, children, className, activeTab: controlledActiveTab, onChange }: TabsProps) {
    const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id);

    // Use controlled value if provided, otherwise use internal state
    const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

    const handleTabChange = (tabId: string) => {
        if (onChange) {
            // Controlled mode: notify parent
            onChange(tabId);
        } else {
            // Uncontrolled mode: update internal state
            setInternalActiveTab(tabId);
        }
    };

    return (
        <div className={className}>
            {/* Tab Headers */}
            <div className="flex border-b border-[var(--color-border)] mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-[1px]',
                            activeTab === tab.id
                                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{children(activeTab)}</div>
        </div>
    );
}
