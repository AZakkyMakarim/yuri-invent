'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, FolderTree, Ruler, Check, X } from 'lucide-react';
import {
    Button,
    Input,
    Modal,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    TableEmpty,
    Tabs,
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
    createdAt: string;
    createdBy: { id: string; name: string } | null;
}

interface UOM {
    id: string;
    name: string;
    symbol: string;
    isActive: boolean;
    createdAt: string;
    createdBy: { id: string; name: string } | null;
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

type SortField = 'code' | 'name' | 'createdAt' | 'status';

interface Filters {
    code: string;
    name: string;
    status: string[];
    creator: string[];
    dateStart: string;
    dateEnd: string;
}

interface SortState {
    field: SortField | null;
    direction: SortDirection;
}

const defaultFilters: Filters = {
    code: '',
    name: '',
    status: [],
    creator: [],
    dateStart: '',
    dateEnd: '',
};

const ITEMS_PER_PAGE = 10;

export default function CategoryPage() {
    const t = useTranslations('master.category');
    const tUom = useTranslations('master.uom');
    const tCommon = useTranslations('common');

    // Categories State
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryTotal, setCategoryTotal] = useState(0);
    const [categoryTotalPages, setCategoryTotalPages] = useState(0);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', code: '', isActive: true });
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categoryFilters, setCategoryFilters] = useState<Filters>(defaultFilters);
    const [categorySort, setCategorySort] = useState<SortState>({ field: null, direction: null });
    const [categoryPage, setCategoryPage] = useState(1);

    // UOM State
    const [uoms, setUoms] = useState<UOM[]>([]);
    const [uomTotal, setUomTotal] = useState(0);
    const [uomTotalPages, setUomTotalPages] = useState(0);
    const [uomModalOpen, setUomModalOpen] = useState(false);
    const [editingUom, setEditingUom] = useState<UOM | null>(null);
    const [uomForm, setUomForm] = useState({ name: '', symbol: '', isActive: true });
    const [uomLoading, setUomLoading] = useState(false);
    const [uomFilters, setUomFilters] = useState<Filters>(defaultFilters);
    const [uomSort, setUomSort] = useState<SortState>({ field: null, direction: null });
    const [uomPage, setUomPage] = useState(1);

    // All creators for filter dropdowns (fetched once)
    const [allCategoryCreators, setAllCategoryCreators] = useState<string[]>([]);
    const [allUomCreators, setAllUomCreators] = useState<string[]>([]);

    // Pending filters for staged filtering
    const [pendingCategoryFilters, setPendingCategoryFilters] = useState<Filters>(defaultFilters);
    const [pendingUomFilters, setPendingUomFilters] = useState<Filters>(defaultFilters);

    const statusOptions = ['Active', 'Inactive'];

    // Check if there are active filters
    const hasCategoryActiveFilters =
        categoryFilters.code !== '' ||
        categoryFilters.name !== '' ||
        categoryFilters.status.length > 0 ||
        categoryFilters.creator.length > 0 ||
        categoryFilters.dateStart !== '' ||
        categoryFilters.dateEnd !== '';

    const hasUomActiveFilters =
        uomFilters.code !== '' ||
        uomFilters.name !== '' ||
        uomFilters.status.length > 0 ||
        uomFilters.creator.length > 0 ||
        uomFilters.dateStart !== '' ||
        uomFilters.dateEnd !== '';

    // Apply/Reset filter functions
    const applyCategoryFilters = () => {
        setCategoryFilters(pendingCategoryFilters);
        setCategoryPage(1);
    };

    const resetCategoryFilters = () => {
        setPendingCategoryFilters(defaultFilters);
        setCategoryFilters(defaultFilters);
        setCategoryPage(1);
    };

    const applyUomFilters = () => {
        setUomFilters(pendingUomFilters);
        setUomPage(1);
    };

    const resetUomFilters = () => {
        setPendingUomFilters(defaultFilters);
        setUomFilters(defaultFilters);
        setUomPage(1);
    };

    // Build query string for API
    const buildQueryString = useCallback((
        page: number,
        filters: Filters,
        sort: SortState,
        codeField: string = 'code'
    ) => {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', ITEMS_PER_PAGE.toString());

        if (filters.code) params.set(codeField, filters.code);
        if (filters.name) params.set('name', filters.name);
        if (filters.status.length > 0) params.set('status', filters.status.join(','));
        if (filters.creator.length > 0) params.set('creators', filters.creator.join(','));
        if (filters.dateStart) params.set('dateStart', filters.dateStart);
        if (filters.dateEnd) params.set('dateEnd', filters.dateEnd);

        if (sort.field && sort.direction) {
            params.set('sortField', sort.field);
            params.set('sortDir', sort.direction);
        }

        return params.toString();
    }, []);

    // Fetch categories with pagination
    const fetchCategories = useCallback(async () => {
        try {
            const query = buildQueryString(categoryPage, categoryFilters, categorySort, 'code');
            const response = await apiFetch<PaginatedResponse<Category>>(`/categories?${query}`);
            setCategories(response.data);
            setCategoryTotal(response.total);
            setCategoryTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, [categoryPage, categoryFilters, categorySort, buildQueryString]);

    // Fetch UOMs with pagination
    const fetchUoms = useCallback(async () => {
        try {
            const query = buildQueryString(uomPage, uomFilters, uomSort, 'symbol');
            const response = await apiFetch<PaginatedResponse<UOM>>(`/uoms?${query}`);
            setUoms(response.data);
            setUomTotal(response.total);
            setUomTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching UOMs:', error);
        }
    }, [uomPage, uomFilters, uomSort, buildQueryString]);

    // Fetch all creators for filter dropdowns (only once)
    const fetchCreators = useCallback(async () => {
        try {
            // Fetch all categories to get unique creators
            const catResponse = await apiFetch<PaginatedResponse<Category>>('/categories?limit=10');
            const catCreators = catResponse.data
                .map((c) => c.createdBy?.name)
                .filter(Boolean) as string[];
            setAllCategoryCreators([...new Set(catCreators)]);

            // Fetch all UOMs to get unique creators
            const uomResponse = await apiFetch<PaginatedResponse<UOM>>('/uoms?limit=10');
            const uomCreators = uomResponse.data
                .map((u) => u.createdBy?.name)
                .filter(Boolean) as string[];
            setAllUomCreators([...new Set(uomCreators)]);
        } catch (error) {
            console.error('Error fetching creators:', error);
        }
    }, []);

    // Fetch data when dependencies change
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchUoms();
    }, [fetchUoms]);

    useEffect(() => {
        fetchCreators();
    }, [fetchCreators]);

    // Reset page when filters change
    useEffect(() => {
        setCategoryPage(1);
    }, [categoryFilters]);

    useEffect(() => {
        setUomPage(1);
    }, [uomFilters]);

    // Sort toggle helper
    const toggleSort = (
        field: SortField,
        currentSort: SortState,
        setSort: (sort: SortState) => void
    ) => {
        if (currentSort.field !== field) {
            setSort({ field, direction: 'asc' });
        } else if (currentSort.direction === 'asc') {
            setSort({ field, direction: 'desc' });
        } else {
            setSort({ field: null, direction: null });
        }
    };

    // Category handlers
    const openCategoryModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({ name: category.name, code: category.code, isActive: category.isActive });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', code: '', isActive: true });
        }
        setCategoryModalOpen(true);
    };

    const handleCategorySubmit = async () => {
        setCategoryLoading(true);
        try {
            if (editingCategory) {
                await apiFetch(`/categories/${editingCategory.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(categoryForm),
                });
            } else {
                await apiFetch('/categories', {
                    method: 'POST',
                    body: JSON.stringify(categoryForm),
                });
            }
            setCategoryModalOpen(false);
            fetchCategories();
            fetchCreators(); // Refresh creators list
        } catch (error) {
            console.error('Error saving category:', error);
        } finally {
            setCategoryLoading(false);
        }
    };

    const handleCategoryDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await apiFetch(`/categories/${id}`, { method: 'DELETE' });
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    // UOM handlers
    const openUomModal = (uom?: UOM) => {
        if (uom) {
            setEditingUom(uom);
            setUomForm({ name: uom.name, symbol: uom.symbol, isActive: uom.isActive });
        } else {
            setEditingUom(null);
            setUomForm({ name: '', symbol: '', isActive: true });
        }
        setUomModalOpen(true);
    };

    const handleUomSubmit = async () => {
        setUomLoading(true);
        try {
            if (editingUom) {
                await apiFetch(`/uoms/${editingUom.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(uomForm),
                });
            } else {
                await apiFetch('/uoms', {
                    method: 'POST',
                    body: JSON.stringify(uomForm),
                });
            }
            setUomModalOpen(false);
            fetchUoms();
            fetchCreators(); // Refresh creators list
        } catch (error) {
            console.error('Error saving UOM:', error);
        } finally {
            setUomLoading(false);
        }
    };

    const handleUomDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this UOM?')) return;
        try {
            await apiFetch(`/uoms/${id}`, { method: 'DELETE' });
            fetchUoms();
        } catch (error) {
            console.error('Error deleting UOM:', error);
        }
    };

    const tabs = [
        { id: 'categories', label: t('title'), icon: <FolderTree size={18} /> },
        { id: 'uom', label: tUom('title'), icon: <Ruler size={18} /> },
    ];

    return (
        <div className="animate-fadeIn">
            <Tabs tabs={tabs} defaultTab="categories">
                {(activeTab) => (
                    <>
                        {/* Categories Tab */}
                        {activeTab === 'categories' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h1 className="text-xl font-bold">{t('title')}</h1>
                                    <Button onClick={() => openCategoryModal()} leftIcon={<Plus size={18} />}>
                                        {t('addNew')}
                                    </Button>
                                </div>

                                {/* Filter Panel */}
                                <TableFilters
                                    hasActiveFilters={hasCategoryActiveFilters}
                                    onApply={applyCategoryFilters}
                                    onReset={resetCategoryFilters}
                                >
                                    <FilterField label="Code">
                                        <TextFilter
                                            value={pendingCategoryFilters.code}
                                            onChange={(v) => setPendingCategoryFilters({ ...pendingCategoryFilters, code: v })}
                                            placeholder="Filter code..."
                                        />
                                    </FilterField>
                                    <FilterField label="Name">
                                        <TextFilter
                                            value={pendingCategoryFilters.name}
                                            onChange={(v) => setPendingCategoryFilters({ ...pendingCategoryFilters, name: v })}
                                            placeholder="Filter name..."
                                        />
                                    </FilterField>
                                    <FilterField label="Status">
                                        <MultiSelectFilter
                                            options={statusOptions}
                                            selected={pendingCategoryFilters.status}
                                            onChange={(v) => setPendingCategoryFilters({ ...pendingCategoryFilters, status: v })}
                                            placeholder="All"
                                        />
                                    </FilterField>
                                    <FilterField label="Created">
                                        <DateRangeFilter
                                            startDate={pendingCategoryFilters.dateStart}
                                            endDate={pendingCategoryFilters.dateEnd}
                                            onChange={(s, e) => setPendingCategoryFilters({ ...pendingCategoryFilters, dateStart: s, dateEnd: e })}
                                        />
                                    </FilterField>
                                </TableFilters>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">No</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={categorySort.field === 'code' ? categorySort.direction : null}
                                                onSort={() => toggleSort('code', categorySort, setCategorySort)}
                                            >
                                                {t('code')}
                                            </SortableTableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={categorySort.field === 'name' ? categorySort.direction : null}
                                                onSort={() => toggleSort('name', categorySort, setCategorySort)}
                                            >
                                                {t('name')}
                                            </SortableTableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={categorySort.field === 'createdAt' ? categorySort.direction : null}
                                                onSort={() => toggleSort('createdAt', categorySort, setCategorySort)}
                                            >
                                                Created
                                            </SortableTableHead>
                                            <TableHead>Creator</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={categorySort.field === 'status' ? categorySort.direction : null}
                                                onSort={() => toggleSort('status', categorySort, setCategorySort)}
                                            >
                                                {tCommon('status')}
                                            </SortableTableHead>
                                            <TableHead className="w-24">{tCommon('actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.length === 0 ? (
                                            <TableEmpty colSpan={7} message={tCommon('noData')} />
                                        ) : (
                                            categories.map((category, index) => (
                                                <TableRow key={category.id}>
                                                    <TableCell className="text-(--color-text-muted)">
                                                        {(categoryPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{category.code}</TableCell>
                                                    <TableCell>{category.name}</TableCell>
                                                    <TableCell className="text-sm text-(--color-text-secondary)">
                                                        {formatDate(category.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {category.createdBy?.name || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={category.isActive ? 'success' : 'danger'}>
                                                            {category.isActive ? (
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
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openCategoryModal(category)}
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCategoryDelete(category.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <Pagination
                                    currentPage={categoryPage}
                                    totalPages={categoryTotalPages}
                                    totalItems={categoryTotal}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setCategoryPage}
                                />
                            </div>
                        )}

                        {/* UOM Tab */}
                        {activeTab === 'uom' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h1 className="text-xl font-bold">{tUom('title')}</h1>
                                    <Button onClick={() => openUomModal()} leftIcon={<Plus size={18} />}>
                                        {tUom('addNew')}
                                    </Button>
                                </div>

                                {/* Filter Panel */}
                                <TableFilters
                                    hasActiveFilters={hasUomActiveFilters}
                                    onApply={applyUomFilters}
                                    onReset={resetUomFilters}
                                >
                                    <FilterField label="Symbol">
                                        <TextFilter
                                            value={pendingUomFilters.code}
                                            onChange={(v) => setPendingUomFilters({ ...pendingUomFilters, code: v })}
                                            placeholder="Filter symbol..."
                                        />
                                    </FilterField>
                                    <FilterField label="Name">
                                        <TextFilter
                                            value={pendingUomFilters.name}
                                            onChange={(v) => setPendingUomFilters({ ...pendingUomFilters, name: v })}
                                            placeholder="Filter name..."
                                        />
                                    </FilterField>
                                    <FilterField label="Status">
                                        <MultiSelectFilter
                                            options={statusOptions}
                                            selected={pendingUomFilters.status}
                                            onChange={(v) => setPendingUomFilters({ ...pendingUomFilters, status: v })}
                                            placeholder="All"
                                        />
                                    </FilterField>
                                    <FilterField label="Created">
                                        <DateRangeFilter
                                            startDate={pendingUomFilters.dateStart}
                                            endDate={pendingUomFilters.dateEnd}
                                            onChange={(s, e) => setPendingUomFilters({ ...pendingUomFilters, dateStart: s, dateEnd: e })}
                                        />
                                    </FilterField>
                                </TableFilters>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">No</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={uomSort.field === 'code' ? uomSort.direction : null}
                                                onSort={() => toggleSort('code', uomSort, setUomSort)}
                                            >
                                                {tUom('symbol')}
                                            </SortableTableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={uomSort.field === 'name' ? uomSort.direction : null}
                                                onSort={() => toggleSort('name', uomSort, setUomSort)}
                                            >
                                                {tUom('name')}
                                            </SortableTableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={uomSort.field === 'createdAt' ? uomSort.direction : null}
                                                onSort={() => toggleSort('createdAt', uomSort, setUomSort)}
                                            >
                                                Created
                                            </SortableTableHead>
                                            <TableHead>Creator</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={uomSort.field === 'status' ? uomSort.direction : null}
                                                onSort={() => toggleSort('status', uomSort, setUomSort)}
                                            >
                                                {tCommon('status')}
                                            </SortableTableHead>
                                            <TableHead className="w-24">{tCommon('actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {uoms.length === 0 ? (
                                            <TableEmpty colSpan={7} message={tCommon('noData')} />
                                        ) : (
                                            uoms.map((uom, index) => (
                                                <TableRow key={uom.id}>
                                                    <TableCell className="text-(--color-text-muted)">
                                                        {(uomPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{uom.symbol}</TableCell>
                                                    <TableCell>{uom.name}</TableCell>
                                                    <TableCell className="text-sm text-(--color-text-secondary)">
                                                        {formatDate(uom.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {uom.createdBy?.name || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={uom.isActive ? 'success' : 'danger'}>
                                                            {uom.isActive ? (
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
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openUomModal(uom)}
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleUomDelete(uom.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <Pagination
                                    currentPage={uomPage}
                                    totalPages={uomTotalPages}
                                    totalItems={uomTotal}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setUomPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </Tabs>

            {/* Category Modal */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title={editingCategory ? `${tCommon('edit')} ${t('title')}` : t('addNew')}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button onClick={handleCategorySubmit} isLoading={categoryLoading}>
                            {tCommon('save')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label={t('code')}
                        value={categoryForm.code}
                        onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                        placeholder="e.g., ELEC"
                    />
                    <Input
                        label={t('name')}
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="e.g., Electronics"
                    />
                    <div className="pt-2">
                        <Toggle
                            label={tCommon('status')}
                            description={categoryForm.isActive ? 'Active' : 'Inactive'}
                            checked={categoryForm.isActive}
                            onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                        />
                    </div>
                </div>
            </Modal>

            {/* UOM Modal */}
            <Modal
                isOpen={uomModalOpen}
                onClose={() => setUomModalOpen(false)}
                title={editingUom ? `${tCommon('edit')} ${tUom('title')}` : tUom('addNew')}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setUomModalOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button onClick={handleUomSubmit} isLoading={uomLoading}>
                            {tCommon('save')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label={tUom('symbol')}
                        value={uomForm.symbol}
                        onChange={(e) => setUomForm({ ...uomForm, symbol: e.target.value })}
                        placeholder="e.g., pcs"
                    />
                    <Input
                        label={tUom('name')}
                        value={uomForm.name}
                        onChange={(e) => setUomForm({ ...uomForm, name: e.target.value })}
                        placeholder="e.g., Pieces"
                    />
                    <div className="pt-2">
                        <Toggle
                            label={tCommon('status')}
                            description={uomForm.isActive ? 'Active' : 'Inactive'}
                            checked={uomForm.isActive}
                            onChange={(e) => setUomForm({ ...uomForm, isActive: e.target.checked })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
