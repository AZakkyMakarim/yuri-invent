'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, AlertTriangle, Check, Package, ImageIcon, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getItemsForPicker } from '@/app/actions/items';
import { useTranslations } from 'next-intl';
import QuickItemModal from './QuickItemModal';

interface ItemOption {
    itemId: string;
    code: string;
    name: string;
    uom: string;
    unitPrice: number;
    fromRabLineId?: string;
    rabQty?: number;
    isSuppliedByVendor: boolean;
    imagePath?: string | null;
    brand?: string | null;
    type?: string | null;
    movementType?: string | null;
    categoryName?: string;
    color?: string | null;
    weight?: number | null;
    dimensions?: { length: number; width: number; height: number } | null;
}

// ... (props interface remains same)

interface ItemPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddItem: (item: ItemOption) => void;
    vendorId: string;
    vendorSuppliedItems: any[];
    rabId?: string;
    rab?: any;
}

export default function ItemPickerModal({
    isOpen,
    onClose,
    onAddItem,
    vendorId,
    vendorSuppliedItems,
    rabId,
    rab
}: ItemPickerModalProps) {
    // ... (state lines 41-66 remain same)
    const t = useTranslations('purchase.itemPicker');
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'rab' | 'catalog'>('all');
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
    const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);

    // Fetch catalog items when modal opens
    useEffect(() => {
        if (isOpen && catalogItems.length === 0) {
            setIsLoadingCatalog(true);
            getItemsForPicker(vendorId).then(result => {
                if (result.success && result.data) {
                    setCatalogItems(result.data);
                }
                setIsLoadingCatalog(false);
            });
        }
    }, [isOpen, vendorId, catalogItems.length]);

    // Build available items list
    const availableItems = useMemo(() => {
        const items: ItemOption[] = [];

        // Add RAB items if RAB is selected
        if (rab && rab.rabLines) {
            rab.rabLines.forEach((line: any) => {
                if (line.replenishQty > 0) {
                    const isSupplied = vendorSuppliedItems?.some(vi => vi.itemId === line.itemId);
                    items.push({
                        itemId: line.itemId,
                        code: line.item.code || line.item.sku,
                        name: line.item.name,
                        uom: line.item.uom?.symbol || 'pcs',
                        unitPrice: Number(line.unitPrice),
                        fromRabLineId: line.id,
                        rabQty: line.replenishQty,
                        isSuppliedByVendor: isSupplied,
                        imagePath: line.item.imagePath,
                        categoryName: line.item.category?.name || '-',
                        brand: line.item.brand,
                        type: line.item.type,
                        color: line.item.color,
                        weight: line.item.weight,
                        dimensions: (line.item.length || line.item.width || line.item.height) ? {
                            length: line.item.length || 0,
                            width: line.item.width || 0,
                            height: line.item.height || 0
                        } : null
                    });
                }
            });
        }

        // Add catalog items (items not in RAB)
        catalogItems.forEach((catalogItem: any) => {
            // Skip if already in RAB
            const inRab = items.some(item => item.itemId === catalogItem.id);
            if (inRab) return;

            const isSupplied = vendorSuppliedItems?.some(vi => vi.itemId === catalogItem.id);

            // Get vendor price if available, otherwise use 0
            let price = 0;
            if (catalogItem.vendorSupplies && catalogItem.vendorSupplies.length > 0) {
                price = Number(catalogItem.vendorSupplies[0].cogsPerUom);
            }

            items.push({
                itemId: catalogItem.id,
                code: catalogItem.code || catalogItem.sku,
                name: catalogItem.name,
                uom: catalogItem.uom?.symbol || 'pcs',
                unitPrice: price,
                fromRabLineId: undefined,
                rabQty: undefined,
                isSuppliedByVendor: isSupplied,
                imagePath: catalogItem.imagePath,
                brand: catalogItem.brand,
                type: catalogItem.type,
                movementType: catalogItem.movementType,
                categoryName: catalogItem.category?.name || '-',
                color: catalogItem.color,
                weight: catalogItem.weight,
                dimensions: (catalogItem.length || catalogItem.width || catalogItem.height) ? {
                    length: catalogItem.length || 0,
                    width: catalogItem.width || 0,
                    height: catalogItem.height || 0
                } : null
            });
        });

        return items;
    }, [rab, catalogItems, vendorSuppliedItems]);

    // Filter items based on search and source filter
    const filteredItems = useMemo(() => {
        return availableItems.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.code.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesSource =
                sourceFilter === 'all' ||
                (sourceFilter === 'rab' && item.fromRabLineId) ||
                (sourceFilter === 'catalog' && !item.fromRabLineId);

            return matchesSearch && matchesSource;
        });
    }, [availableItems, searchQuery, sourceFilter]);

    // --- QUICK ADD LOGIC IS REMOVED/DISABLED BY DESIGN CHOICE IN FAVOR OF CATALOG ---
    // But kept conditional render false for now to avoid breaking changes if structure needed later

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={t('title')}
                size="3xl"
            >
                <div className="flex flex-col h-[500px]">
                    {/* Filters */}
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                            <Input
                                placeholder={t('searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-(--color-bg-secondary)"
                            />
                        </div>
                        <div className="flex bg-(--color-bg-secondary) rounded-md p-1 border border-(--color-border)">
                            <button
                                onClick={() => setSourceFilter('all')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${sourceFilter === 'all'
                                    ? 'bg-(--color-bg-primary) text-(--color-primary) shadow-sm'
                                    : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
                                    }`}
                            >
                                {t('filters.all')}
                            </button>
                            <button
                                onClick={() => setSourceFilter('rab')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${sourceFilter === 'rab'
                                    ? 'bg-(--color-bg-primary) text-(--color-primary) shadow-sm'
                                    : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
                                    }`}
                            >
                                {t('filters.rab')}
                            </button>
                            <button
                                onClick={() => setSourceFilter('catalog')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${sourceFilter === 'catalog'
                                    ? 'bg-(--color-bg-primary) text-(--color-primary) shadow-sm'
                                    : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
                                    }`}
                            >
                                {t('filters.catalog')}
                            </button>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => setIsQuickItemOpen(true)}
                            className="border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary)/10 text-sm h-auto py-1.5"
                        >
                            + New Item
                        </Button>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto border border-(--color-border) rounded-md bg-(--color-bg-secondary)/30">
                        {isLoadingCatalog && availableItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-(--color-text-secondary)">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary) mb-4"></div>
                                <p>{t('loading')}</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-(--color-text-muted)">
                                <Search className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-lg font-medium">{t('noItemsFound')}</p>
                                <p className="text-sm mt-1">{t('tryAdjustingSearch')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-1 p-2">
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.itemId}
                                        className="flex items-stretch gap-3 p-3 rounded-lg bg-(--color-bg-primary) border border-(--color-border) hover:border-(--color-primary)/50 hover:shadow-sm transition-all group"
                                    >
                                        {/* Main Content - Fluid */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            {/* Header: Badges & Name */}
                                            <div className="flex flex-col mb-2">
                                                <div className="flex">
                                                    <div className="flex flex-col w-3/4">
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                            <span className="font-mono text-[10px] font-medium text-(--color-text-muted) bg-(--color-bg-secondary) px-1.5 py-0.5 rounded border border-(--color-border)">
                                                                {item.code}
                                                            </span>
                                                            {item.fromRabLineId ? (
                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 px-1.5 py-0.5 rounded">
                                                                    {t('badges.rab')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 px-1.5 py-0.5 rounded">
                                                                    {t('badges.catalog')}
                                                                </span>
                                                            )}
                                                            {item.movementType && (
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.movementType === 'FAST'
                                                                    ? 'border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'border-(--color-border) text-(--color-text-secondary) bg-(--color-bg-secondary)'
                                                                    }`}>
                                                                    {item.movementType}
                                                                </span>
                                                            )}
                                                            {!item.isSuppliedByVendor ? (
                                                                <span className="inline-flex items-center gap-1 text-[9px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-1 rounded font-medium leading-tight">
                                                                    <AlertTriangle size={10} />
                                                                    {t('notSupplied')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[9px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-1 rounded font-medium leading-tight">
                                                                    <PackageCheck size={10} />
                                                                    Disuplai oleh vendor
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-(--color-text-primary) text-base truncate" title={item.name}>
                                                            {item.name}
                                                        </h4>
                                                    </div>
                                                    <div className="flex flex-col text-right w-1/4 justify-center">
                                                        {/* Price */}
                                                        {item.unitPrice > 0 ? (
                                                            <div className="mb-1">
                                                                <div className="text-[10px] text-(--color-text-muted) uppercase tracking-wider mb-0.5">{t('estPrice')}</div>
                                                                <div className="font-bold text-base text-(--color-primary) whitespace-nowrap">
                                                                    {new Intl.NumberFormat('id-ID', {
                                                                        style: 'currency',
                                                                        currency: 'IDR',
                                                                        maximumFractionDigits: 0
                                                                    }).format(item.unitPrice)}
                                                                </div>
                                                                <div className="text-[10px] text-(--color-text-muted) mt-0.5">
                                                                    / <span className="font-medium text-(--color-text-primary)">{item.uom}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mb-1">
                                                                <div className="text-xs italic text-(--color-text-muted)">
                                                                    Price N/A
                                                                </div>
                                                                <div className="text-[10px] text-(--color-text-muted) mt-0.5">
                                                                    / <span className="font-medium text-(--color-text-primary)">{item.uom}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Specs Row - Consistent Layout */}
                                            <div className="flex items-center gap-4 text-xs mt-4 pt-2 border-t border-(--color-border)/50">
                                                <div className="flex flex-col min-w-[60px]">
                                                    <span className="text-[9px] text-(--color-text-muted) uppercase font-semibold tracking-wider mb-0.5">Kategori</span>
                                                    <span className="font-medium text-(--color-text-primary) truncate max-w-[80px]" title={item.categoryName || '-'}>{item.categoryName || '-'}</span>
                                                </div>
                                                <div className="flex flex-col min-w-[60px] border-l border-(--color-border) pl-3">
                                                    <span className="text-[9px] text-(--color-text-muted) uppercase font-semibold tracking-wider mb-0.5">Merk</span>
                                                    <span className="font-medium text-(--color-text-primary) truncate max-w-[80px]" title={item.brand || '-'}>{item.brand || '-'}</span>
                                                </div>
                                                <div className="flex flex-col min-w-[60px] border-l border-(--color-border) pl-3">
                                                    <span className="text-[9px] text-(--color-text-muted) uppercase font-semibold tracking-wider mb-0.5">Tipe</span>
                                                    <span className="font-medium text-(--color-text-primary) truncate max-w-[80px]" title={item.type || '-'}>{item.type || '-'}</span>
                                                </div>
                                                <div className="flex flex-col min-w-[60px] border-l border-(--color-border) pl-3">
                                                    <span className="text-[9px] text-(--color-text-muted) uppercase font-semibold tracking-wider mb-0.5">Warna</span>
                                                    <span className="font-medium text-(--color-text-primary) truncate max-w-[80px]" title={item.color || '-'}>{item.color || '-'}</span>
                                                </div>
                                                <div className="flex flex-col min-w-[60px] border-l border-(--color-border) pl-3">
                                                    <span className="text-[9px] text-(--color-text-muted) uppercase font-semibold tracking-wider mb-0.5">Dimensi</span>
                                                    <span className="font-medium text-(--color-text-primary) truncate" title={item.dimensions ? `${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height}` : '-'}>
                                                        {item.dimensions ? `${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height}` : '-'} <span className="text-[10px] text-(--color-text-muted) font-normal">cm</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions & Price - Fixed Width Column */}
                                        <div className="w-24 shrink-0 flex flex-col justify-center items-center pl-4 border-l border-(--color-border)">
                                            {/* Image - Fixed Size */}
                                            <div className="h-20 w-full mb-2 shrink-0 bg-white rounded-lg border border-(--color-border) flex items-center justify-center overflow-hidden self-start shadow-sm">
                                                {item.imagePath ? (
                                                    <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover transition-transform hover:scale-105 duration-300" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-(--color-text-muted) p-1">
                                                        <ImageIcon size={20} className="mb-1 opacity-30" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-full space-y-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        onAddItem(item);
                                                        onClose();
                                                    }}
                                                    className="w-full h-8 text-xs bg-(--color-primary) hover:bg-(--color-primary)/90 text-white shadow-sm font-medium"
                                                >
                                                    {t('add')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex justify-between items-center text-xs text-(--color-text-muted)">
                        <p>
                            {t('showing')} <span className="font-medium text-(--color-text-primary)">{filteredItems.length}</span> {t('items')}
                        </p>
                    </div>
                </div>
            </Modal>

            <QuickItemModal
                isOpen={isQuickItemOpen}
                onClose={() => setIsQuickItemOpen(false)}
                vendorId={vendorId}
                onSuccess={(newItem) => {
                    // Update catalog items with new item
                    setCatalogItems([newItem, ...catalogItems]);
                    if (searchQuery) setSearchQuery('');
                }}
            />
        </>
    );
}
