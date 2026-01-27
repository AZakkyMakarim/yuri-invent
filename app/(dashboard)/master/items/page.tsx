'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Check, X, Package, Image as ImageIcon, UploadCloud } from 'lucide-react';
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
import { apiFetch, compressImage } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
    createdBy: { id: string; name: string; role: { name: string } } | null;
    imagePath?: string | null;
    barcode?: string | null;
    brand?: string | null;
    type?: string | null;
    color?: string | null;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    movementType?: string | null;
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

type SortField = 'sku' | 'name' | 'category' | 'uom' | 'minStockLevel' | 'maxStockLevel' | 'createdAt' | 'status' | 'barcode';

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
    imagePath?: string | null;
    barcode?: string | null;
    brand: string;
    type: string;
    color: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    movementType: string;
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
    imagePath: null,
    barcode: '',
    brand: '',
    type: '',
    color: '',
    weight: null,
    length: null,
    width: null,
    height: null,
    movementType: '',
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
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

    // Auth
    const { user } = useAuth();

    const [form, setForm] = useState<ItemForm>(defaultItemForm);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);
    const [sort, setSort] = useState<SortState>({ field: null, direction: null });
    const [page, setPage] = useState(1);

    // Image overlay state
    const [viewedImage, setViewedImage] = useState<string | null>(null);



    // Reference data
    const [categories, setCategories] = useState<Category[]>([]);
    const [uoms, setUoms] = useState<UOM[]>([]);
    const [allCreators, setAllCreators] = useState<string[]>([]);

    const statusOptions = ['Active', 'Inactive'];

    // Get status label helper
    const getStatusLabel = (status: string) => {
        if (status === 'Active') return t('statusLabel.active');
        if (status === 'Inactive') return t('statusLabel.inactive');
        return status;
    };

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
                barcode: item.barcode || '',
                imagePath: item.imagePath || null,
                brand: item.brand || '',
                type: item.type || '',
                color: item.color || '',
                weight: item.weight ?? null,
                length: item.length ?? null,
                width: item.width ?? null,
                height: item.height ?? null,
                movementType: item.movementType || '',
            });
            setImagePreview(item.imagePath || null);
            setSelectedImageFile(null);
        } else {
            setEditingItem(null);
            setForm(defaultItemForm);
            setImagePreview(null);
            setSelectedImageFile(null);
        }
        setModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageFile(file);
            const objectUrl = URL.createObjectURL(file);
            setImagePreview(objectUrl);
        }
    };

    const handleSubmit = async () => {
        if (!form.categoryId || !form.uomId) {
            alert('Please select Category and UOM');
            return;
        }

        setLoading(true);
        try {
            let finalImagePath = form.imagePath;

            // Get user ID from AuthContext (this maps to local DB ID)
            const userId = user?.id;

            // Get session for upload token
            const { data: { session } } = await supabase.auth.getSession();

            // Upload image if selected
            if (selectedImageFile) {
                // Compress image before upload
                const compressedFile = await compressImage(selectedImageFile);

                const formData = new FormData();
                formData.append('file', compressedFile);

                const headers: HeadersInit = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const uploadRes = await fetch('/api/upload/item-image', {
                    method: 'POST',
                    headers,
                    body: formData,
                });

                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) {
                    throw new Error(uploadData.error || t('errors.uploadImage'));
                }

                finalImagePath = uploadData.path;
            }

            const payload = {
                ...form,
                imagePath: finalImagePath,
                ...(userId && { createdById: userId }), // Add creator ID
            };

            if (editingItem) {
                await apiFetch(`/items/${editingItem.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiFetch('/items', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            setModalOpen(false);
            fetchItems();
            fetchCreators();
        } catch (error) {
            console.error('Error saving item:', error);
            alert(tCommon('failed') + ': ' + t('errors.saveItem'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;
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
                    <Package size={24} className="text-(--color-primary)" />
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
                <FilterField label={t('table.sku')}>
                    <TextFilter
                        value={pendingFilters.sku}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, sku: v })}
                        placeholder={t('searchPlaceholder')}
                    />
                </FilterField>
                <FilterField label={t('table.name')}>
                    <TextFilter
                        value={pendingFilters.name}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, name: v })}
                        placeholder={t('searchPlaceholder')}
                    />
                </FilterField>
                <FilterField label={t('filters.category')}>
                    <MultiSelectFilter
                        options={categoryOptions}
                        selected={getCategoryDisplayNames(pendingFilters.categoryIds)}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, categoryIds: getCategoryIdsFromDisplay(v) })}
                        placeholder={t('placeholders.all')}
                    />
                </FilterField>
                <FilterField label={t('filters.uom')}>
                    <MultiSelectFilter
                        options={uomOptions}
                        selected={getUomDisplayNames(pendingFilters.uomIds)}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, uomIds: getUomIdsFromDisplay(v) })}
                        placeholder={t('placeholders.all')}
                    />
                </FilterField>
                <FilterField label={t('filters.status')}>
                    <MultiSelectFilter
                        options={statusOptions}
                        selected={pendingFilters.status}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, status: v })}
                        placeholder={t('placeholders.all')}
                        formatLabel={getStatusLabel}
                    />
                </FilterField>
                <FilterField label={t('filters.date')}>
                    <DateRangeFilter
                        startDate={pendingFilters.dateStart}
                        endDate={pendingFilters.dateEnd}
                        onChange={(s, e) => setPendingFilters({ ...pendingFilters, dateStart: s, dateEnd: e })}
                    />
                </FilterField>
            </TableFilters>

            <Table>
                <TableHeader>
                    {/* Main Header Rows */}
                    <TableRow className="bg-(--color-bg-tertiary)">
                        <TableHead rowSpan={2} className="w-12 border-r border-(--color-border)">No</TableHead>
                        <TableHead rowSpan={2} className="w-16 border-r border-(--color-border)">{t('form.image')}</TableHead>

                        {/* Identity Group */}
                        <TableHead colSpan={3} className="text-center border-r border-(--color-border) bg-(--color-bg-secondary)/50 font-bold text-(--color-primary)">
                            Identity
                        </TableHead>

                        {/* Specifications Group */}
                        <TableHead colSpan={3} className="text-center border-r border-(--color-border) bg-(--color-bg-secondary)/50 font-bold text-(--color-primary)">
                            Specifications
                        </TableHead>

                        {/* Dimensions Group */}
                        <TableHead colSpan={2} className="text-center border-r border-(--color-border) bg-(--color-bg-secondary)/50 font-bold text-(--color-primary)">
                            Dimensions
                        </TableHead>

                        {/* Classification Group */}
                        <TableHead colSpan={2} className="text-center border-r border-(--color-border) bg-(--color-bg-secondary)/50 font-bold text-(--color-primary)">
                            Classification
                        </TableHead>

                        {/* Inventory Group */}
                        <TableHead colSpan={3} className="text-center border-r border-(--color-border) bg-(--color-bg-secondary)/50 font-bold text-(--color-primary)">
                            Inventory Control
                        </TableHead>

                        <TableHead rowSpan={2} className="w-20 border-r border-(--color-border)">{tCommon('status')}</TableHead>
                        <TableHead rowSpan={2} className="w-20">{tCommon('actions')}</TableHead>
                    </TableRow>

                    {/* Sub Headers */}
                    <TableRow>
                        {/* Identity Subcols */}
                        <SortableTableHead sortable sortDirection={sort.field === 'sku' ? sort.direction : null} onSort={() => toggleSort('sku')}>
                            {t('table.sku')}
                        </SortableTableHead>
                        <SortableTableHead sortable sortDirection={sort.field === 'barcode' ? sort.direction : null} onSort={() => toggleSort('barcode')}>
                            {t('form.barcode')}
                        </SortableTableHead>
                        <SortableTableHead sortable sortDirection={sort.field === 'name' ? sort.direction : null} onSort={() => toggleSort('name')}>
                            {t('table.name')}
                        </SortableTableHead>

                        {/* Specs Subcols */}
                        <TableHead>Brand</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Color</TableHead>

                        {/* Dims Subcols */}
                        <TableHead className="text-right">Weight (g)</TableHead>
                        <TableHead>Dim (LxWxH)</TableHead>

                        {/* Class Subcols */}
                        <SortableTableHead sortable sortDirection={sort.field === 'category' ? sort.direction : null} onSort={() => toggleSort('category')}>
                            {t('table.category')}
                        </SortableTableHead>
                        <TableHead>Movement</TableHead>

                        {/* Inv Subcols */}
                        <SortableTableHead sortable sortDirection={sort.field === 'minStockLevel' ? sort.direction : null} onSort={() => toggleSort('minStockLevel')} className="text-right">
                            Min
                        </SortableTableHead>
                        <SortableTableHead sortable sortDirection={sort.field === 'maxStockLevel' ? sort.direction : null} onSort={() => toggleSort('maxStockLevel')} className="text-right">
                            Max
                        </SortableTableHead>
                        <SortableTableHead sortable sortDirection={sort.field === 'uom' ? sort.direction : null} onSort={() => toggleSort('uom')} className="text-center">
                            {t('table.uom')}
                        </SortableTableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableEmpty colSpan={17} message={tCommon('noData')} />
                    ) : (
                        items.map((item, index) => (
                            <TableRow key={item.id} className="hover:bg-(--color-bg-tertiary)/30">
                                <TableCell className="text-(--color-text-muted) border-r border-(--color-border)/50 text-center">
                                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                </TableCell>
                                <TableCell className="border-r border-(--color-border)/50 p-2">
                                    {item.imagePath ? (
                                        <div
                                            className="h-10 w-10 rounded border overflow-hidden shrink-0 bg-white cursor-pointer hover:opacity-80 transition-opacity mx-auto"
                                            onClick={() => setViewedImage(item.imagePath || null)}
                                        >
                                            <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-10 w-10 rounded border bg-gray-50 flex items-center justify-center shrink-0 mx-auto">
                                            <ImageIcon size={16} className="text-gray-300" />
                                        </div>
                                    )}
                                </TableCell>

                                {/* Identity */}
                                <TableCell className="font-mono text-xs font-medium text-(--color-text-primary)">
                                    {item.sku}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-(--color-text-muted)">
                                    {item.barcode || '-'}
                                </TableCell>
                                <TableCell className="font-medium text-(--color-text-primary) border-r border-(--color-border)/50">
                                    {item.name}
                                </TableCell>

                                {/* Specifications */}
                                <TableCell className="text-xs">{item.brand || '-'}</TableCell>
                                <TableCell className="text-xs">{item.type || '-'}</TableCell>
                                <TableCell className="text-xs border-r border-(--color-border)/50">{item.color || '-'}</TableCell>

                                {/* Dimensions */}
                                <TableCell className="text-xs text-right font-mono">
                                    {item.weight ? `${item.weight}` : '-'}
                                </TableCell>
                                <TableCell className="text-xs text-center font-mono border-r border-(--color-border)/50">
                                    {(item.length || item.width || item.height) ?
                                        `${item.length ?? '-'}x${item.width ?? '-'}x${item.height ?? '-'}` :
                                        '-'}
                                </TableCell>

                                {/* Classification */}
                                <TableCell className="text-center">
                                    <span className="text-xs px-2 py-0.5 rounded bg-(--color-bg-tertiary) font-medium">
                                        {item.category.code}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center border-r border-(--color-border)/50">
                                    {item.movementType && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${item.movementType === 'FAST' ? 'bg-green-50 text-green-700 border-green-200' :
                                            item.movementType === 'SLOW' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            }`}>
                                            {item.movementType}
                                        </span>
                                    )}
                                </TableCell>

                                {/* Inventory */}
                                <TableCell className="text-right text-xs font-mono">
                                    {item.minStockLevel}
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono">
                                    {item.maxStockLevel}
                                </TableCell>
                                <TableCell className="text-center text-xs text-(--color-text-muted) border-r border-(--color-border)/50">
                                    {item.uom.symbol}
                                </TableCell>

                                <TableCell className="text-center border-r border-(--color-border)/50">
                                    <Badge variant={item.isActive ? 'success' : 'danger'} className="text-[10px] h-5 px-1.5">
                                        {item.isActive ? t('statusLabel.active') : t('statusLabel.inactive')}
                                    </Badge>
                                </TableCell>

                                <TableCell className="text-center">
                                    <Button variant="ghost" size="sm" onClick={() => openModal(item)} className="h-8 w-8 p-0">
                                        <Pencil size={14} />
                                    </Button>
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
                title={editingItem ? t('form.editTitle') : t('form.createTitle')}
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
                    <Dropdown
                        label={t('form.category')}
                        value={form.categoryId}
                        onChange={(v) => setForm({ ...form, categoryId: v })}
                        options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                        placeholder={t('form.selectCategory')}
                        searchable
                    />
                    <Dropdown
                        label="Tipe Pergerakan"
                        value={form.movementType}
                        onChange={(v) => setForm({ ...form, movementType: v })}
                        options={[
                            { value: 'FAST', label: 'Fast Moving' },
                            { value: 'MEDIUM', label: 'Medium Moving' },
                            { value: 'SLOW', label: 'Slow Moving' },
                        ]}
                        placeholder="Pilih Tipe Pergerakan"
                    />
                    <Input
                        label={t('form.sku')}
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder={t('placeholders.sku')}
                    />
                    <Input
                        label={t('form.name')}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={t('placeholders.name')}
                    />
                    <Input
                        label="Merk"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        placeholder="cth. Nike, Samsung"
                    />
                    <Input
                        label="Tipe/Model"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        placeholder="cth. Air Max, S24 Ultra"
                    />
                    <Input
                        label="Warna"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        placeholder="cth. Merah, Hitam"
                    />
                    <Dropdown
                        label={t('form.selectUom')}
                        value={form.uomId}
                        onChange={(v) => setForm({ ...form, uomId: v })}
                        options={uoms.map((u) => ({ value: u.id, label: `${u.symbol} - ${u.name}` }))}
                        placeholder={t('form.selectUom')}
                        searchable
                    />
                    <div className="col-span-2">
                        <Input
                            label={t('form.barcode')}
                            value={form.barcode || ''}
                            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                            placeholder={t('form.scanBarcode')}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm font-medium mb-1 block">{t('form.image')}</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-center cursor-pointer relative" onClick={() => document.getElementById('image-upload')?.click()}>
                            {imagePreview ? (
                                <div className="relative inline-block group">
                                    <img src={imagePreview} alt="Preview" className="h-48 rounded-lg object-contain bg-white border" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                        <span className="text-white font-medium">{t('form.imageChange')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-500">
                                    <UploadCloud size={32} />
                                    <p className="text-sm font-medium">{t('form.imageHint')}</p>
                                    <p className="text-xs px-2">{t('form.imageFormat')}</p>
                                </div>
                            )}
                            <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <NumberInput
                            label="Berat (g)"
                            value={form.weight ?? 0}
                            onChange={(v) => setForm({ ...form, weight: v })}
                            min={0}
                        />
                    </div>
                    <div className="col-span-2 grid grid-cols-3 gap-4 border p-4 rounded-lg bg-gray-50/50">
                        <div className="col-span-3 text-sm font-medium">Dimensi (cm)</div>
                        <NumberInput
                            label="Panjang"
                            value={form.length ?? 0}
                            onChange={(v) => setForm({ ...form, length: v })}
                            min={0}
                        />
                        <NumberInput
                            label="Lebar"
                            value={form.width ?? 0}
                            onChange={(v) => setForm({ ...form, width: v })}
                            min={0}
                        />
                        <NumberInput
                            label="Tinggi"
                            value={form.height ?? 0}
                            onChange={(v) => setForm({ ...form, height: v })}
                            min={0}
                        />
                    </div>

                    <NumberInput
                        label={t('form.minStock')}
                        value={form.minStockLevel}
                        onChange={(v) => setForm({ ...form, minStockLevel: v })}
                        min={0}
                    />
                    <NumberInput
                        label={t('form.maxStock')}
                        value={form.maxStockLevel}
                        onChange={(v) => setForm({ ...form, maxStockLevel: v })}
                        min={0}
                    />
                    <div className="col-span-2">
                        <Input
                            label={t('form.description')}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder={t('placeholders.description')}
                        />
                    </div>
                    <div className="col-span-2 pt-2">
                        <Toggle
                            label={t('form.status')}
                            description={form.isActive ? t('statusLabel.active') : t('statusLabel.inactive')}
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                    </div>
                </div>
            </Modal>
            {/* Image Overlay */}
            {viewedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setViewedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setViewedImage(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2 bg-black/50 rounded-full"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={viewedImage}
                            alt="Full size preview"
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
