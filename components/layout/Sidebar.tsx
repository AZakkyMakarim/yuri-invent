'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    LayoutDashboard,
    PackagePlus,
    PackageMinus,
    Package,
    ShoppingCart,
    ClipboardList,
    Settings2,
    RotateCcw,
    Receipt,
    PiggyBank,
    Database,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
    key: string;
    href?: string;
    icon: React.ReactNode;
    children?: { key: string; href: string }[];
}

const navItems: NavItem[] = [
    { key: 'dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    {
        key: 'inbound',
        icon: <PackagePlus size={20} />,
        children: [
            { key: 'inboundList', href: '/inbound' },
            { key: 'inboundVerification', href: '/inbound/verification' },
        ],
    },
    {
        key: 'outbound',
        icon: <PackageMinus size={20} />,
        children: [
            { key: 'outboundList', href: '/outbound' },
            { key: 'outboundVerification', href: '/outbound/verification' },
        ],
    },
    {
        key: 'stock',
        icon: <Package size={20} />,
        children: [
            { key: 'stockCard', href: '/stock/card' },
            { key: 'items', href: '/stock/items' },
        ],
    },
    {
        key: 'purchaseRequest',
        icon: <ShoppingCart size={20} />,
        children: [
            { key: 'prList', href: '/purchase' },
            { key: 'prVerification', href: '/purchase/manager-verification' },
            { key: 'poVerification', href: '/purchase/purchasing-verification' },
        ],
    },
    {
        key: 'stockOpname',
        icon: <ClipboardList size={20} />,
        children: [
            { key: 'opnameList', href: '/opname' },
            { key: 'opnameSchedule', href: '/opname/schedule' },
        ],
    },
    {
        key: 'adjustment',
        icon: <Settings2 size={20} />,
        children: [
            { key: 'adjustmentList', href: '/adjustment' },
            { key: 'adjustmentVerification', href: '/adjustment/verification' },
        ],
    },
    {
        key: 'return',
        icon: <RotateCcw size={20} />,
        children: [
            { key: 'returnList', href: '/return' },
            { key: 'returnVerification', href: '/return/verification' },
        ],
    },
    {
        key: 'billing',
        icon: <Receipt size={20} />,
        children: [
            { key: 'billList', href: '/billing' },
            { key: 'billVerification', href: '/billing/verification' },
            { key: 'paymentRealization', href: '/billing/payment' },
            { key: 'paymentValidation', href: '/billing/payment-validation' },
        ],
    },
    {
        key: 'budget',
        icon: <PiggyBank size={20} />,
        children: [
            { key: 'rabList', href: '/budget' },
            { key: 'rabInput', href: '/budget/input' },
            { key: 'rabVerification', href: '/budget/verification' },
            { key: 'rabRealization', href: '/budget/realization' },
        ],
    },
    {
        key: 'master',
        icon: <Database size={20} />,
        children: [
            { key: 'category', href: '/master/category' },
            { key: 'itemMaster', href: '/master/items' },
            { key: 'vendor', href: '/master/vendor' },
            { key: 'mitra', href: '/master/mitra' },
        ],
    },
];

export default function Sidebar() {
    const t = useTranslations('nav');
    const pathname = usePathname();
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['master']);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [currentLocale, setCurrentLocale] = useState('id');

    const toggleMenu = (key: string) => {
        setExpandedMenus((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const isActive = (href: string) => pathname === href;
    const isParentActive = (children: { href: string }[]) =>
        children.some((child) => pathname.startsWith(child.href));

    const toggleLocale = async () => {
        const newLocale = currentLocale === 'id' ? 'en' : 'id';
        document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
        setCurrentLocale(newLocale);
        window.location.reload();
    };

    const NavContent = () => (
        <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
                {navItems.map((item) => (
                    <li key={item.key}>
                        {item.href ? (
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                    isActive(item.href)
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                                )}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                {item.icon}
                                <span className="font-medium">{t(item.key)}</span>
                            </Link>
                        ) : (
                            <>
                                <button
                                    onClick={() => toggleMenu(item.key)}
                                    className={cn(
                                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        item.children && isParentActive(item.children)
                                            ? 'text-[var(--color-primary)]'
                                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon}
                                        <span className="font-medium">{t(item.key)}</span>
                                    </div>
                                    {expandedMenus.includes(item.key) ? (
                                        <ChevronDown size={16} />
                                    ) : (
                                        <ChevronRight size={16} />
                                    )}
                                </button>
                                {item.children && expandedMenus.includes(item.key) && (
                                    <ul className="mt-1 ml-4 pl-4 border-l border-[var(--color-border)] space-y-1">
                                        {item.children.map((child) => (
                                            <li key={child.key}>
                                                <Link
                                                    href={child.href}
                                                    className={cn(
                                                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                                                        isActive(child.href)
                                                            ? 'bg-[var(--color-primary)] text-white'
                                                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                                                    )}
                                                    onClick={() => setIsMobileOpen(false)}
                                                >
                                                    {t(child.key)}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
            >
                <Menu size={24} />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 h-full w-[var(--sidebar-width)] bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col z-50 transition-transform duration-300',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border)]">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                            <Package size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg">Yuri Invent</span>
                    </Link>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden p-1 rounded hover:bg-[var(--color-bg-hover)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                <NavContent />

                {/* Footer - Language Toggle */}
                <div className="p-4 border-t border-[var(--color-border)]">
                    <button
                        onClick={toggleLocale}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                        <Globe size={18} />
                        <span className="text-sm font-medium">
                            {currentLocale === 'id' ? 'Bahasa Indonesia' : 'English'}
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
}
