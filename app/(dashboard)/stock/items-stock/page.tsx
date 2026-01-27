'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    TableEmpty,
    Pagination,
    TableFilters,
    FilterField,
    MultiSelectFilter,
} from '@/components/ui';
import { apiFetch, formatCurrency } from '@/lib/utils';
import { Package, TrendingUp, Archive, Tags } from 'lucide-react';

interface ValuationItem {
    id: string;
    sku: string;
    name: string;
    category: string;
    uom: string;
    currentStock: number;
    unitPrice: number;
    totalValue: number;
    brand?: string | null;
    type?: string | null;
    movementType?: string | null;
}

interface ValuationResponse {
    data: ValuationItem[];
    total: number;
    summary: {
        totalItems: number;
        totalStock: number;
        totalValue: number;
        averageUnitValue: number;
    };
}

const ITEMS_PER_PAGE = 10;

export default function ItemsStockPage() {
    const tCommon = useTranslations('common');

    const [items, setItems] = useState<ValuationItem[]>([]);
    const [summary, setSummary] = useState({
        totalItems: 0,
        totalStock: 0,
        totalValue: 0,
        averageUnitValue: 0
    });
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filter Options
    const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
    const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        categoryIds: [] as string[],
        itemIds: [] as string[],
    });
    const [pendingFilters, setPendingFilters] = useState(filters);

    // Fetch Categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiFetch<any>('/categories?limit=100', { cache: 'no-store' });
                if (res?.data) {
                    setCategoryOptions(res.data.map((c: any) => ({
                        label: c.name,
                        value: c.id
                    })));
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Items for dropdown (Cascading based on Category)
    useEffect(() => {
        const fetchItemOptions = async () => {
            try {
                const params = new URLSearchParams();
                params.set('limit', '1000'); // Fetch enough items for the dropdown

                // If categories selected, filter items by them
                if (pendingFilters.categoryIds.length > 0) {
                    params.set('categoryIds', pendingFilters.categoryIds.join(','));
                }

                const res = await apiFetch<any>(`/items?${params.toString()}`);
                if (res?.data) {
                    setItemOptions(res.data.map((i: any) => ({
                        label: `${i.sku} - ${i.name}`,
                        value: i.id
                    })));
                }
            } catch (error) {
                console.error('Error fetching item options:', error);
            }
        };
        fetchItemOptions();
    }, [pendingFilters.categoryIds]); // Refetch items when category filter changes

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', ITEMS_PER_PAGE.toString());
            if (filters.search) params.set('search', filters.search);
            if (filters.categoryIds.length > 0) params.set('categoryIds', filters.categoryIds.join(','));
            if (filters.itemIds.length > 0) params.set('itemIds', filters.itemIds.join(','));

            const response = await apiFetch<ValuationResponse>(`/stock/valuation?${params.toString()}`);
            setItems(response.data);
            setTotal(response.total);
            setSummary(response.summary);
        } catch (error) {
            console.error('Error fetching valuation:', error);
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Handle Category Filter Change (Reset Item filter if category changes)
    const handleCategoryChange = (selectedIds: string[]) => {
        setPendingFilters(prev => ({
            ...prev,
            categoryIds: selectedIds,
            itemIds: [] // Reset selected items as the available list changes
        }));
    };

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package size={24} className="text-(--color-primary)" />
                    <h1 className="text-xl font-bold">Items & Stock</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-(--color-bg-card) p-4 rounded-lg border border-(--color-border) shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-(--color-text-muted)">Total Items</p>
                            <p className="text-2xl font-bold">{summary.totalItems}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-(--color-bg-card) p-4 rounded-lg border border-(--color-border) shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                            <Archive size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-(--color-text-muted)">Total Stock</p>
                            <p className="text-2xl font-bold">{summary.totalStock?.toLocaleString('id-ID') || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-(--color-bg-card) p-4 rounded-lg border border-(--color-border) shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                            <Tags size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-(--color-text-muted)">Avg. Unit Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(summary.averageUnitValue || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-(--color-bg-card) p-4 rounded-lg border border-(--color-border) shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-(--color-text-muted)">Total Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(summary.totalValue || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <TableFilters
                hasActiveFilters={!!filters.search || filters.categoryIds.length > 0 || filters.itemIds.length > 0}
                onApply={() => { setFilters(pendingFilters); setPage(1); }}
                onReset={() => {
                    setPendingFilters({ search: '', categoryIds: [], itemIds: [] });
                    setFilters({ search: '', categoryIds: [], itemIds: [] });
                    setPage(1);
                }}
            >
                <FilterField label="Category">
                    <MultiSelectFilter
                        options={categoryOptions.map(o => o.label)}
                        selected={pendingFilters.categoryIds.map(id => categoryOptions.find(o => o.value === id)?.label || id)}
                        onChange={(labels) => {
                            // Map labels back to IDs
                            const ids = labels.map(l => categoryOptions.find(o => o.label === l)?.value).filter(Boolean) as string[];
                            handleCategoryChange(ids);
                        }}
                        placeholder="All Categories"
                    />
                </FilterField>

                <FilterField label="Item">
                    <MultiSelectFilter
                        options={itemOptions.map(o => o.label)}
                        selected={pendingFilters.itemIds.map(id => itemOptions.find(o => o.value === id)?.label || id)}
                        onChange={(labels) => {
                            const ids = labels.map(l => itemOptions.find(o => o.label === l)?.value).filter(Boolean) as string[];
                            setPendingFilters(prev => ({ ...prev, itemIds: ids }));
                        }}
                        placeholder="All Items"
                    />
                </FilterField>
            </TableFilters>

            <div className="rounded-lg border border-(--color-border) overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">No</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Unit Price (Est.)</TableHead>
                            <TableHead className="text-right">Total Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">{tCommon('loading')}</TableCell>
                            </TableRow>
                        ) : items.length === 0 ? (
                            <TableEmpty colSpan={6} message="No items found." />
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-(--color-text-muted)">
                                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-xs text-(--color-text-muted) font-mono">{item.sku}</span>
                                            <div className="text-[10px] text-(--color-text-muted) mt-0.5 flex flex-wrap gap-x-2">
                                                {item.brand && <span>B: {item.brand}</span>}
                                                {item.type && <span>T: {item.type}</span>}
                                                {item.movementType && <span>M: {item.movementType}</span>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {item.currentStock} <span className="text-xs font-normal text-gray-500">{item.uom}</span>
                                    </TableCell>
                                    <TableCell className="text-right text-(--color-text-secondary)">
                                        {formatCurrency(item.unitPrice)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-(--color-text-primary)">
                                        {formatCurrency(item.totalValue)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / ITEMS_PER_PAGE)}
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
            />
        </div>
    );
}
