'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getItemsForPicker } from '@/app/actions/items';

interface ItemOption {
    itemId: string;
    code: string;
    name: string;
    uom: string;
    unitPrice: number;
    fromRabLineId?: string;
    rabQty?: number;
    isSuppliedByVendor: boolean;
}

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
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'rab' | 'catalog'>('all');
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Quick add form state
    const [newItemCode, setNewItemCode] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [newItemUom, setNewItemUom] = useState('pcs');
    const [newItemPrice, setNewItemPrice] = useState('');

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
                        isSuppliedByVendor: isSupplied
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
                code: catalogItem.sku,
                name: catalogItem.name,
                uom: catalogItem.uom?.symbol || 'pcs',
                unitPrice: price,
                fromRabLineId: undefined,
                rabQty: undefined,
                isSuppliedByVendor: isSupplied
            });
        });

        return items;
    }, [rab, catalogItems, vendorSuppliedItems]);

    // Filter items based on search and source filter
    const filteredItems = useMemo(() => {
        let filtered = availableItems;

        // Apply source filter
        if (sourceFilter === 'rab') {
            filtered = filtered.filter(item => item.fromRabLineId);
        } else if (sourceFilter === 'catalog') {
            filtered = filtered.filter(item => !item.fromRabLineId);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.code.toLowerCase().includes(query) ||
                item.name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [availableItems, searchQuery, sourceFilter]);

    const handleAddItem = (item: ItemOption) => {
        onAddItem(item);
        onClose();
    };

    const handleQuickAdd = () => {
        if (!newItemCode || !newItemName) {
            alert('Please enter item code and name');
            return;
        }

        // Create a temporary item (not saved to master catalog)
        const quickItem: ItemOption = {
            itemId: `temp_${Date.now()}`, // Temporary ID
            code: newItemCode,
            name: newItemName,
            uom: newItemUom,
            unitPrice: Number(newItemPrice) || 0,
            fromRabLineId: undefined,
            rabQty: undefined,
            isSuppliedByVendor: false // Quick-added items are not in vendor list
        };

        onAddItem(quickItem);

        // Reset form
        setNewItemCode('');
        setNewItemName('');
        setNewItemUom('pcs');
        setNewItemPrice('');
        setShowQuickAdd(false);

        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Item to Purchase Request">
            <div className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={18} />
                        <Input
                            type="text"
                            placeholder="Search by code or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-(--color-bg-secondary) border-(--color-border)"
                        />
                    </div>

                    {/* Source Filter Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSourceFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceFilter === 'all'
                                ? 'bg-(--color-primary) text-white'
                                : 'bg-(--color-bg-secondary) text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                                }`}
                        >
                            All Items ({availableItems.length})
                        </button>
                        {rabId && (
                            <button
                                onClick={() => setSourceFilter('rab')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceFilter === 'rab'
                                    ? 'bg-(--color-primary) text-white'
                                    : 'bg-(--color-bg-secondary) text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                                    }`}
                            >
                                From RAB ({availableItems.filter(i => i.fromRabLineId).length})
                            </button>
                        )}
                        <button
                            onClick={() => setSourceFilter('catalog')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceFilter === 'catalog'
                                ? 'bg-(--color-primary) text-white'
                                : 'bg-(--color-bg-secondary) text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                                }`}
                        >
                            Catalog ({availableItems.filter(i => !i.fromRabLineId).length})
                        </button>
                    </div>
                </div>

                {/* Quick Add Item Form */}
                {!showQuickAdd ? (
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setShowQuickAdd(true)}
                            className="text-sm border-(--color-border)"
                        >
                            + Item not in catalog? Quick Add
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-(--color-text-primary)">Quick Add New Item</h4>
                            <button
                                onClick={() => setShowQuickAdd(false)}
                                className="text-(--color-text-muted) hover:text-(--color-text-primary)"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-(--color-text-secondary) block mb-1">Item Code*</label>
                                <Input
                                    type="text"
                                    value={newItemCode}
                                    onChange={(e) => setNewItemCode(e.target.value)}
                                    placeholder="e.g., ITM-001"
                                    className="h-9 bg-(--color-bg-primary) border-(--color-border)"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-(--color-text-secondary) block mb-1">UOM</label>
                                <Input
                                    type="text"
                                    value={newItemUom}
                                    onChange={(e) => setNewItemUom(e.target.value)}
                                    placeholder="e.g., pcs"
                                    className="h-9 bg-(--color-bg-primary) border-(--color-border)"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-(--color-text-secondary) block mb-1">Item Name*</label>
                            <Input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="e.g., Office Chair"
                                className="h-9 bg-(--color-bg-primary) border-(--color-border)"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-(--color-text-secondary) block mb-1">Unit Price (Optional)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                                placeholder="0.00"
                                className="h-9 bg-(--color-bg-primary) border-(--color-border)"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setShowQuickAdd(false)}
                                size="sm"
                                className="border-(--color-border)"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleQuickAdd}
                                size="sm"
                                className="bg-(--color-primary) hover:bg-(--color-primary)/90 text-white"
                            >
                                Add to Request
                            </Button>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⚠️ Note: This item will only be added to this purchase request. It won't be saved to your master catalog.
                        </p>
                    </div>
                )}

                {/* Items List */}
                <div className="max-h-96 overflow-y-auto border border-(--color-border) rounded-lg">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-(--color-text-muted)">
                            {searchQuery ? 'No items match your search' : rabId ? 'No items available in RAB' : 'Select a RAB to see items'}
                        </div>
                    ) : (
                        <div className="divide-y divide-(--color-border)">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.itemId}
                                    className="p-4 hover:bg-(--color-bg-hover) transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-(--color-text-primary)">
                                                    {item.code}
                                                </span>
                                                {/* Show RAB and Vendor Supply Status */}
                                                <div className="flex items-center gap-2">
                                                    {/* RAB Badge */}
                                                    {item.fromRabLineId && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            RAB
                                                        </span>
                                                    )}

                                                    {/* Vendor Supply Status */}
                                                    {item.isSuppliedByVendor ? (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 inline-flex items-center gap-1">
                                                            <Check size={10} /> Supplied
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 inline-flex items-center gap-1">
                                                            <span className="text-[10px]">✕</span> Unsupplied
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-(--color-text-secondary)">
                                                {item.name}
                                            </p>
                                            {!item.isSuppliedByVendor && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <AlertTriangle size={12} />
                                                    {item.unitPrice > 0
                                                        ? 'Price may need verification - vendor doesn\'t typically supply this'
                                                        : 'No vendor pricing available - price must be entered manually'}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-(--color-text-muted)">
                                                {item.rabQty && (
                                                    <span>RAB Qty: {item.rabQty} {item.uom}</span>
                                                )}
                                                <span>Est. Price: Rp {item.unitPrice.toLocaleString('id-ID')}/{item.uom}</span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddItem(item)}
                                            className="bg-(--color-primary) hover:bg-(--color-primary)/90 text-white"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-(--color-border)">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="border-(--color-border)"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
