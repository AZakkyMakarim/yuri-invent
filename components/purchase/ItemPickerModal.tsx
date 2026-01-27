'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, AlertTriangle, Check } from 'lucide-react';
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
                        imagePath: line.item.imagePath
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
                movementType: catalogItem.movementType
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
                                        className="flex items-center justify-between p-3 rounded-lg bg-(--color-bg-primary) border border-(--color-border) hover:border-(--color-primary)/50 hover:shadow-sm transition-all group"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs text-(--color-text-muted) bg-(--color-bg-secondary) px-1.5 py-0.5 rounded-sm">
                                                    {item.code}
                                                </span>
                                                {item.fromRabLineId ? (
                                                    <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                                                        {t('badges.rab')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                                                        {t('badges.catalog')}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-medium text-(--color-text-primary) truncate">
                                                {item.name}
                                            </h4>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5 mb-1.5">
                                                {item.brand && (
                                                    <span className="text-[10px] text-(--color-text-secondary)">
                                                        <span className="text-(--color-text-muted)">B:</span> {item.brand}
                                                    </span>
                                                )}
                                                {item.type && (
                                                    <span className="text-[10px] text-(--color-text-secondary)">
                                                        <span className="text-(--color-text-muted)">T:</span> {item.type}
                                                    </span>
                                                )}
                                                {item.movementType && (
                                                    <span className="text-[10px] text-(--color-text-secondary)">
                                                        <span className="text-(--color-text-muted)">M:</span> {item.movementType}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-(--color-text-secondary)">
                                                <span>
                                                    {t('uom')}: <span className="font-medium text-(--color-text-primary)">{item.uom}</span>
                                                </span>
                                                {item.rabQty && (
                                                    <span>
                                                        {t('rabQty')}: <span className="font-medium text-blue-600 dark:text-blue-400">{item.rabQty}</span>
                                                    </span>
                                                )}
                                                {!item.isSuppliedByVendor && (
                                                    <span className="flex items-center text-orange-600 dark:text-orange-400">
                                                        <AlertTriangle size={12} className="mr-1" />
                                                        {t('notSupplied')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Price display if available */}
                                            {item.unitPrice > 0 && (
                                                <div className="text-right hidden sm:block">
                                                    <div className="text-xs text-(--color-text-muted)">{t('estPrice')}</div>
                                                    <div className="font-medium">
                                                        {new Intl.NumberFormat('id-ID', {
                                                            style: 'currency',
                                                            currency: 'IDR',
                                                            maximumFractionDigits: 0
                                                        }).format(item.unitPrice)}
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    onAddItem(item);
                                                    onClose(); // Optional: close on add, or keep open for multiple
                                                }}
                                                className="whitespace-nowrap bg-(--color-primary) hover:bg-(--color-primary)/90 text-white"
                                            >
                                                {t('add')}
                                            </Button>
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
