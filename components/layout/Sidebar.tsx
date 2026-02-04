'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
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
    ChevronUp,
    Menu,
    X,
    Globe,
    User,
    LogOut,
    Sun,
    Moon,
    Banknote
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
    key: string;
    href?: string;
    icon: React.ReactNode;
    permission?: string; // Module key from database
    children?: { key: string; href: string; permission?: string }[];
}

const navItems: NavItem[] = [
    { key: 'dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    {
        key: 'inbound',
        icon: <PackagePlus size={20} />,
        children: [
            { key: 'inboundList', href: '/inbound', permission: 'inbound_list' },
            { key: 'inboundVerification', href: '/inbound/verification', permission: 'inbound_verification' },
            { key: 'inboundIssues', href: '/inbound/issues', permission: 'inbound_verification' },
        ],
    },
    {
        key: 'outbound',
        icon: <PackageMinus size={20} />,
        children: [
            { key: 'outboundList', href: '/outbound', permission: 'outbound_list_request' },
            { key: 'outboundVerification', href: '/outbound/verification', permission: 'outbound_verification' },
        ],
    },
    {
        key: 'stock',
        icon: <Package size={20} />,
        children: [
            { key: 'stockCard', href: '/stock/card', permission: 'stock_card' },
            { key: 'itemsStock', href: '/stock/items-stock', permission: 'items_stock' },
        ],
    },
    {
        key: 'purchaseRequest',
        icon: <ShoppingCart size={20} />,
        children: [
            { key: 'prList', href: '/purchase', permission: 'pr_list' },
            { key: 'prInput', href: '/purchase/input', permission: 'pr_input' },
            { key: 'prVerification', href: '/purchase/manager-verification', permission: 'pr_verification' },
            { key: 'prConfirmation', href: '/purchase/confirmation', permission: 'pr_verification' }, // Should use distinct permission in real app
            { key: 'poVerification', href: '/purchase/purchasing-verification', permission: 'po_verification' },
        ],
    },
    {
        key: 'finance',
        icon: <Banknote size={20} />,
        children: [
            { key: 'paymentRealization', href: '/finance/payment-realization', permission: 'payment_realization' },
        ],
    },
    {
        key: 'stockOpname',
        icon: <ClipboardList size={20} />,
        children: [
            { key: 'opnameList', href: '/opname', permission: 'opname_list' },
            { key: 'opnameSchedule', href: '/opname/schedule', permission: 'opname_schedule' },
        ],
    },
    {
        key: 'adjustment',
        icon: <Settings2 size={20} />,
        children: [
            { key: 'adjustmentList', href: '/stock-adjustment', permission: 'adjustment_list_input' },
            { key: 'adjustmentVerification', href: '/stock-adjustment/verification', permission: 'adjustment_verification' },
        ],
    },
    {
        key: 'return',
        icon: <RotateCcw size={20} />,
        children: [
            { key: 'returnList', href: '/returns', permission: 'return_list_input' },
            { key: 'returnVerification', href: '/returns/verification', permission: 'return_verification' },
        ],
    },
    {
        key: 'billing',
        icon: <Receipt size={20} />,
        children: [
            { key: 'billList', href: '/billing', permission: 'bill_list_input' },
            { key: 'billVerification', href: '/billing/verification', permission: 'bill_verification' },
            { key: 'paymentRealization', href: '/billing/payment', permission: 'payment_realization' },
            { key: 'paymentValidation', href: '/billing/payment-validation', permission: 'payment_validation' },
        ],
    },
    {
        key: 'budget',
        icon: <PiggyBank size={20} />,
        children: [
            { key: 'rabList', href: '/budget', permission: 'rab_list' },
            { key: 'rabInput', href: '/budget/input', permission: 'rab_input' },
            { key: 'rabVerification', href: '/budget/verification', permission: 'rab_verification' },
            { key: 'rabRealization', href: '/budget/realization', permission: 'rab_realization' },
        ],
    },
    {
        key: 'master',
        icon: <Database size={20} />,
        children: [
            { key: 'category', href: '/master/category', permission: 'categories_uom' },
            { key: 'itemMaster', href: '/master/items', permission: 'items' },
            { key: 'warehouses', href: '/master/warehouses', permission: 'warehouses' },
            { key: 'vendor', href: '/master/vendor', permission: 'vendors' },
            { key: 'partners', href: '/master/partners', permission: 'partners_mitra_' },
            { key: 'users', href: '/master/users', permission: 'users_roles' },
        ],
    },
];

export default function Sidebar() {
    const t = useTranslations('nav');
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { user, signOut } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['master']);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [currentLocale, setCurrentLocale] = useState('id');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Filter nav items based on permissions
    const filteredNavItems = navItems.reduce<NavItem[]>((acc, item) => {
        // Helper to check if user has permission for a specific module
        // Helper to check if user has permission for a specific module
        const hasPermission = (moduleKey?: string) => {
            return true; // Bypass permission check

            // Original logic:
            // if (!moduleKey) return true;
            // if (!user?.role?.permissions) return false;
            // return user.role.permissions.some(p => p.module === moduleKey);
        };

        // If item has children, filter them first
        if (item.children) {
            const visibleChildren = item.children.filter(child => hasPermission(child.permission));

            // If has visible children, show parent with only visible children
            if (visibleChildren.length > 0) {
                acc.push({ ...item, children: visibleChildren });
            }
        } else {
            // No children, check item's own permission
            if (hasPermission(item.permission)) {
                acc.push(item);
            }
        }

        return acc;
    }, []);

    useEffect(() => {
        setMounted(true);
        const match = document.cookie.match(new RegExp('(^| )locale=([^;]+)'));
        if (match) setCurrentLocale(match[2]);

        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                {filteredNavItems.map((item) => (
                    <li key={item.key}>
                        {item.href ? (
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                    isActive(item.href)
                                        ? 'bg-(--color-primary) text-white'
                                        : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover) hover:text-(--color-text-primary)'
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
                                            ? 'text-(--color-primary)'
                                            : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover) hover:text-(--color-text-primary)'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon}
                                        <span className="font-medium text-left">{t(item.key)}</span>
                                    </div>
                                    {expandedMenus.includes(item.key) ? (
                                        <ChevronDown size={16} />
                                    ) : (
                                        <ChevronRight size={16} />
                                    )}
                                </button>
                                {item.children && expandedMenus.includes(item.key) && (
                                    <ul className="mt-1 ml-4 pl-4 border-l border-(--color-border) space-y-1">
                                        {item.children.map((child) => (
                                            <li key={child.key}>
                                                <Link
                                                    href={child.href}
                                                    className={cn(
                                                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                                                        isActive(child.href)
                                                            ? 'bg-(--color-primary) text-white'
                                                            : 'text-(--color-text-secondary) hover:bg-(--color-bg-hover) hover:text-(--color-text-primary)'
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
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-(--color-bg-secondary) border border-(--color-border) text-(--color-text-primary)"
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
                    'fixed top-0 left-0 h-full w-(--sidebar-width) bg-(--color-bg-secondary) border-r border-(--color-border) flex flex-col z-50 transition-transform duration-300',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-(--color-border)">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-(--color-primary) to-(--color-secondary) flex items-center justify-center">
                            <Package size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg text-(--color-text-primary)">Yuri Invent</span>
                    </Link>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden p-1 rounded hover:bg-(--color-bg-hover) text-(--color-text-primary)"
                    >
                        <X size={20} />
                    </button>
                </div>

                <NavContent />

                {/* Footer - Profile */}
                <div className="p-4 border-t border-(--color-border)" ref={profileRef}>
                    {isProfileOpen && (
                        <div className="mb-2 bg-(--color-bg-card) border border-(--color-border) rounded-lg shadow-lg overflow-hidden animate-fadeIn">
                            {/* Theme */}
                            <div className="p-2 border-b border-(--color-border)">
                                <p className="text-xs font-semibold text-(--color-text-muted) px-2 mb-1">Theme</p>
                                <div className="flex bg-(--color-bg-tertiary) rounded-md p-1">
                                    <button onClick={() => setTheme('light')} className={cn("flex-1 flex items-center justify-center gap-2 py-1.5 rounded-sm text-xs transition-colors", theme === 'light' ? "bg-(--color-bg-card) text-(--color-text-primary) shadow-sm" : "text-(--color-text-secondary) hover:text-(--color-text-primary)")}>
                                        <Sun size={14} /> Light
                                    </button>
                                    <button onClick={() => setTheme('dark')} className={cn("flex-1 flex items-center justify-center gap-2 py-1.5 rounded-sm text-xs transition-colors", theme === 'dark' ? "bg-(--color-bg-card) text-(--color-text-primary) shadow-sm" : "text-(--color-text-secondary) hover:text-(--color-text-primary)")}>
                                        <Moon size={14} /> Dark
                                    </button>
                                </div>
                            </div>

                            {/* Language */}
                            <div className="p-2 border-b border-(--color-border)">
                                <p className="text-xs font-semibold text-(--color-text-muted) px-2 mb-1">Language</p>
                                <button onClick={toggleLocale} className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-(--color-text-primary) hover:bg-(--color-bg-hover)">
                                    <div className="flex items-center gap-2">
                                        <Globe size={16} />
                                        <span>{currentLocale === 'id' ? 'Bahasa Indonesia' : 'English'}</span>
                                    </div>
                                </button>
                            </div>

                            {/* Sign Out */}
                            <div className="p-2">
                                <button onClick={signOut} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-(--color-danger) hover:bg-(--color-danger)/10">
                                    <LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-(--color-bg-tertiary) hover:bg-(--color-bg-hover) transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-(--color-primary)/10 flex items-center justify-center text-(--color-primary) shrink-0">
                            <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-(--color-text-primary) truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-(--color-text-muted) truncate">{user?.role?.name || 'Role'}</p>
                        </div>
                        <div className="text-(--color-text-secondary)">
                            {isProfileOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </button>
                </div>
            </aside>
        </>
    );
}
