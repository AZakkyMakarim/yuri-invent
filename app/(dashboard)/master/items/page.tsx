'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Check, X, Package } from 'lucide-react';
import {
    Button,
    Input,
    NumberInput,
    Dropdown,
    Modal,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    TableEmpty,
    Badge,
    Toggle,
    SortableTableHead,
    TableFilters,
    FilterField,
    Pagination,
    TextFilter,
    MultiSelectFilter,
    DateRangeFilter,
} from '@/components/ui';
import type { SortDirection } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface Category {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
}

interface UOM {
    id: string;
    name: string;
    symbol: string;
    isActive: boolean;
}

interface Item {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    minStockLevel: number;
    maxStockLevel: number;
    currentStock: number;
    isActive: boolean;
    createdAt: string;
    category: Category;
    uom: UOM;
    createdBy: { id: string; name: string } | null;
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

type SortField = 'sku' | 'name' | 'category' | 'uom' | 'minStockLevel' | 'maxStockLevel' | 'createdAt' | 'status';

interface Filters {
    sku: string;
    name: string;
    categoryIds: string[];
    uomIds: string[];
    status: string[];
    creator: string[];
    dateStart: string;
    dateEnd: string;
}

interface SortState {
    field: SortField | null;
    direction: SortDirection;
}

interface ItemForm {
    sku: string;
    name: string;
    description: string;
    categoryId: string;
    uomId: string;
    minStockLevel: number;
    maxStockLevel: number;
    isActive: boolean;
}

const defaultFilters: Filters = {
    sku: '',
    name: '',
    categoryIds: [],
    uomIds: [],
    status: [],
    creator: [],
    dateStart: '',
    dateEnd: '',
};

const defaultItemForm: ItemForm = {
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    uomId: '',
    minStockLevel: 0,
    maxStockLevel: 0,
    isActive: true,
};

const ITEMS_PER_PAGE = 10;

export default function ItemsPage() {
    const t = useTranslations('master.item');
    const tCommon = useTranslations('common');

    // Items State
    const [items, setItems] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [form, setForm] = useState<ItemForm>(defaultItemForm);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);
    const [sort, setSort] = useState<SortState>({ field: null, direction: null });
    const [page, setPage] = useState(1);

    // Reference data
    const [categories, setCategories] = useState<Category[]>([]);
    const [uoms, setUoms] = useState<UOM[]>([]);
    const [allCreators, setAllCreators] = useState<string[]>([]);

    const statusOptions = ['Active', 'Inactive'];

    // Check if there are active filters
    const hasActiveFilters =
        filters.sku !== '' ||
        filters.name !== '' ||
        filters.categoryIds.length > 0 ||
        filters.uomIds.length > 0 ||
        filters.status.length > 0 ||
        filters.creator.length > 0 ||
        filters.dateStart !== '' ||
        filters.dateEnd !== '';

    // Apply pending filters
    const applyFilters = () => {
        setFilters(pendingFilters);
        setPage(1);
    };

    // Reset both pending and applied filters
    const resetFilters = () => {
        setPendingFilters(defaultFilters);
        setFilters(defaultFilters);
        setPage(1);
    };

    // Build query string
    const buildQueryString = useCallback(() => {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', ITEMS_PER_PAGE.toString());

        if (filters.sku) params.set('sku', filters.sku);
        if (filters.name) params.set('name', filters.name);
        if (filters.categoryIds.length > 0) params.set('categoryIds', filters.categoryIds.join(','));
        if (filters.uomIds.length > 0) params.set('uomIds', filters.uomIds.join(','));
        if (filters.status.length > 0) params.set('status', filters.status.join(','));
        if (filters.creator.length > 0) params.set('creators', filters.creator.join(','));
        if (filters.dateStart) params.set('dateStart', filters.dateStart);
        if (filters.dateEnd) params.set('dateEnd', filters.dateEnd);

        if (sort.field && sort.direction) {
            params.set('sortField', sort.field);
            params.set('sortDir', sort.direction);
        }

        return params.toString();
    }, [page, filters, sort]);

    // Fetch items
    const fetchItems = useCallback(async () => {
        try {
            const query = buildQueryString();
            const response = await apiFetch<PaginatedResponse<Item>>(`/items?${query}`);
            setItems(response.data);
            setTotal(response.total);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    }, [buildQueryString]);

    // Fetch reference data
    const fetchReferenceData = useCallback(async () => {
        try {
            const [catResponse, uomResponse] = await Promise.all([
                apiFetch<PaginatedResponse<Category>>('/categories?limit=10'),
                apiFetch<PaginatedResponse<UOM>>('/uoms?limit=10'),
            ]);
            setCategories(catResponse.data.filter((c) => c.isActive));
            setUoms(uomResponse.data.filter((u) => u.isActive));
        } catch (error) {
            console.error('Error fetching reference data:', error);
        }
    }, []);

    // Fetch creators
    const fetchCreators = useCallback(async () => {
        try {
            const response = await apiFetch<PaginatedResponse<Item>>('/items?limit=10');
            const creators = response.data
                .map((i) => i.createdBy?.name)
                .filter(Boolean) as string[];
            setAllCreators([...new Set(creators)]);
        } catch (error) {
            console.error('Error fetching creators:', error);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    useEffect(() => {
        fetchReferenceData();
        fetchCreators();
    }, [fetchReferenceData, fetchCreators]);



    // Sort toggle helper
    const toggleSort = (field: SortField) => {
        if (sort.field !== field) {
            setSort({ field, direction: 'asc' });
        } else if (sort.direction === 'asc') {
            setSort({ field, direction: 'desc' });
        } else {
            setSort({ field: null, direction: null });
        }
    };

    // Modal handlers
    const openModal = (item?: Item) => {
        if (item) {
            setEditingItem(item);
            setForm({
                sku: item.sku,
                name: item.name,
                description: item.description || '',
                categoryId: item.category.id,
                uomId: item.uom.id,
                minStockLevel: item.minStockLevel,
                maxStockLevel: item.maxStockLevel,
                isActive: item.isActive,
            });
        } else {
            setEditingItem(null);
            setForm(defaultItemForm);
        }
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (editingItem) {
                await apiFetch(`/items/${editingItem.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
            } else {
                await apiFetch('/items', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
            }
            setModalOpen(false);
            fetchItems();
            fetchCreators();
        } catch (error) {
            console.error('Error saving item:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await apiFetch(`/items/${id}`, { method: 'DELETE' });
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    // Get filter options
    const categoryOptions = categories.map((c) => `${c.code} - ${c.name}`);
    const uomOptions = uoms.map((u) => `${u.symbol} - ${u.name}`);

    // Convert between display names and IDs
    const getCategoryDisplayNames = (ids: string[]) => {
        return ids
            .map((id) => {
                const cat = categories.find((c) => c.id === id);
                return cat ? `${cat.code} - ${cat.name}` : null;
            })
            .filter(Boolean) as string[];
    };

    const getCategoryIdsFromDisplay = (displays: string[]) => {
        return displays
            .map((d) => {
                const code = d.split(' - ')[0];
                const cat = categories.find((c) => c.code === code);
                return cat?.id;
            })
            .filter(Boolean) as string[];
    };

    const getUomDisplayNames = (ids: string[]) => {
        return ids
            .map((id) => {
                const uom = uoms.find((u) => u.id === id);
                return uom ? `${uom.symbol} - ${uom.name}` : null;
            })
            .filter(Boolean) as string[];
    };

    const getUomIdsFromDisplay = (displays: string[]) => {
        return displays
            .map((d) => {
                const symbol = d.split(' - ')[0];
                const uom = uoms.find((u) => u.symbol === symbol);
                return uom?.id;
            })
            .filter(Boolean) as string[];
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package size={24} className="text-[var(--color-primary)]" />
                    <h1 className="text-xl font-bold">{t('title')}</h1>
                </div>
                <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                    {t('addNew')}
                </Button>
            </div>

            {/* Filter Panel */}
            <TableFilters
                hasActiveFilters={hasActiveFilters}
                onApply={applyFilters}
                onReset={resetFilters}
            >
                <FilterField label="SKU">
                    <TextFilter
                        value={pendingFilters.sku}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, sku: v })}
                        placeholder="Filter SKU..."
                    />
                </FilterField>
                <FilterField label="Name">
                    <TextFilter
                        value={pendingFilters.name}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, name: v })}
                        placeholder="Filter name..."
                    />
                </FilterField>
                <FilterField label="Category">
                    <MultiSelectFilter
                        options={categoryOptions}
                        selected={getCategoryDisplayNames(pendingFilters.categoryIds)}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, categoryIds: getCategoryIdsFromDisplay(v) })}
                        placeholder="All"
                    />
                </FilterField>
                <FilterField label="UOM">
                    <MultiSelectFilter
                        options={uomOptions}
                        selected={getUomDisplayNames(pendingFilters.uomIds)}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, uomIds: getUomIdsFromDisplay(v) })}
                        placeholder="All"
                    />
                </FilterField>
                <FilterField label="Status">
                    <MultiSelectFilter
                        options={statusOptions}
                        selected={pendingFilters.status}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, status: v })}
                        placeholder="All"
                    />
                </FilterField>
                <FilterField label="Created">
                    <DateRangeFilter
                        startDate={pendingFilters.dateStart}
                        endDate={pendingFilters.dateEnd}
                        onChange={(s, e) => setPendingFilters({ ...pendingFilters, dateStart: s, dateEnd: e })}
                    />
                </FilterField>
            </TableFilters>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'sku' ? sort.direction : null}
                            onSort={() => toggleSort('sku')}
                        >
                            SKU
                        </SortableTableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'name' ? sort.direction : null}
                            onSort={() => toggleSort('name')}
                        >
                            {t('name')}
                        </SortableTableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'category' ? sort.direction : null}
                            onSort={() => toggleSort('category')}
                        >
                            {t('category')}
                        </SortableTableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'uom' ? sort.direction : null}
                            onSort={() => toggleSort('uom')}
                        >
                            UOM
                        </SortableTableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'minStockLevel' ? sort.direction : null}
                            onSort={() => toggleSort('minStockLevel')}
                            className="text-right"
                        >
                            Min Stock
                        </SortableTableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'maxStockLevel' ? sort.direction : null}
                            onSort={() => toggleSort('maxStockLevel')}
                            className="text-right"
                        >
                            Max Stock
                        </SortableTableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'createdAt' ? sort.direction : null}
                            onSort={() => toggleSort('createdAt')}
                        >
                            Created
                        </SortableTableHead>
                        <TableHead>Creator</TableHead>
                        <SortableTableHead
                            sortable
                            sortDirection={sort.field === 'status' ? sort.direction : null}
                            onSort={() => toggleSort('status')}
                        >
                            {tCommon('status')}
                        </SortableTableHead>
                        <TableHead className="w-20">{tCommon('actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableEmpty colSpan={11} message={tCommon('noData')} />
                    ) : (
                        items.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-[var(--color-text-muted)]">
                                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                </TableCell>
                                <TableCell className="font-medium font-mono">{item.sku}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
                                        {item.category.code}
                                    </span>
                                </TableCell>
                                <TableCell>{item.uom.symbol}</TableCell>
                                <TableCell className="text-center">{item.minStockLevel}</TableCell>
                                <TableCell className="text-center">{item.maxStockLevel}</TableCell>
                                <TableCell className="text-sm text-[var(--color-text-secondary)]">
                                    {formatDate(item.createdAt)}
                                </TableCell>
                                <TableCell className="text-sm">{item.createdBy?.name || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={item.isActive ? 'success' : 'danger'}>
                                        {item.isActive ? (
                                            <span className="flex items-center gap-1">
                                                <Check size={12} /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <X size={12} /> Inactive
                                            </span>
                                        )}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openModal(item)}>
                                            <Pencil size={16} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
            />

            {/* Item Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingItem ? `${tCommon('edit')} ${t('title')}` : t('addNew')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button onClick={handleSubmit} isLoading={loading}>
                            {tCommon('save')}
                        </Button>
                    </>
                }
            >
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="SKU"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="e.g., ITM-001"
                    />
                    <Input
                        label={t('name')}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g., Laptop Dell XPS 15"
                    />
                    <Dropdown
                        label={t('category')}
                        value={form.categoryId}
                        onChange={(v) => setForm({ ...form, categoryId: v })}
                        options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                        placeholder="Select category"
                        searchable
                    />
                    <Dropdown
                        label="UOM"
                        value={form.uomId}
                        onChange={(v) => setForm({ ...form, uomId: v })}
                        options={uoms.map((u) => ({ value: u.id, label: `${u.symbol} - ${u.name}` }))}
                        placeholder="Select UOM"
                        searchable
                    />
                    <NumberInput
                        label="Min Stock"
                        value={form.minStockLevel}
                        onChange={(v) => setForm({ ...form, minStockLevel: v })}
                        min={0}
                    />
                    <NumberInput
                        label="Max Stock"
                        value={form.maxStockLevel}
                        onChange={(v) => setForm({ ...form, maxStockLevel: v })}
                        min={0}
                    />
                    <div className="col-span-2">
                        <Input
                            label="Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Optional description..."
                        />
                    </div>
                    <div className="col-span-2 pt-2">
                        <Toggle
                            label={tCommon('status')}
                            description={form.isActive ? 'Active' : 'Inactive'}
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
