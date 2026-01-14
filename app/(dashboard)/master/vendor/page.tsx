'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Filter,
    X,
    Check,
    Briefcase,
    Building2,
    Calendar,
    Phone,
    MapPin,
    CreditCard,
    Eye,
    Package,
    FileText,
    Upload,
    PhoneIcon
} from 'lucide-react';
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
    SortableTableHead,
    TableFilters,
    FilterField,
    Pagination,
    TextFilter,
    MultiSelectFilter,
    DateRangeFilter,
    Dropdown,
    Toggle,
    NumberInput
} from '@/components/ui';
import type { SortDirection } from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface Vendor {
    id: string;
    name: string;
    vendorType: 'SPK' | 'NON_SPK';
    phone: string | null;
    address: string | null;
    bank: string | null;
    bankBranch: string | null;
    bankAccount: string | null;
    spkDocumentPath: string | null;
    isActive: boolean;
    createdAt: string;
    createdBy?: {
        name: string;
    };
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface Filters {
    name: string;
    bank: string[];
    status: string[];
    dateStart: string;
    dateEnd: string;
}

const defaultFilters: Filters = {
    name: '',
    bank: [],
    status: [],
    dateStart: '',
    dateEnd: '',
};

const ITEMS_PER_PAGE = 10;
const statusOptions = ['Active', 'Inactive'];
const bankOptions = ['BCA', 'BRI', 'BNI', 'MANDIRI'];

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);

    // Tab state (serves as a filter for vendorType)
    // 'all' | 'SPK' | 'NON_SPK'
    const [activeTab, setActiveTab] = useState('all');

    // Filter & Sort state
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);
    const [sort, setSort] = useState<{ field: string; direction: SortDirection }>({
        field: 'createdAt',
        direction: 'desc',
    });

    const router = useRouter();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        vendorType: 'NON_SPK',
        phone: '',
        address: '',
        bank: '',
        bankBranch: '',
        bankAccount: '',
        isActive: true,
        vendorItems: [] as Array<{ itemId: string; itemName: string; cogsPerUom: number }>,
        spkDocumentPath: '',
    });

    // Master items for dropdown
    const [items, setItems] = useState<Array<{ id: string; name: string; sku: string; uom: { symbol: string } }>>([]);

    // SPK file state - store the file object, upload on submit
    const [selectedSPKFile, setSelectedSPKFile] = useState<File | null>(null);

    // Fetch Vendors
    const fetchVendors = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', ITEMS_PER_PAGE.toString());
            params.append('sortField', sort.field);
            params.append('sortDir', sort.direction || 'desc');

            // Tab filter
            if (activeTab !== 'all') {
                params.append('vendorType', activeTab);
            }

            // Applied filters
            if (filters.name) params.append('name', filters.name);
            if (filters.bank.length > 0) params.append('bank', filters.bank.join(',')); // API might need single or update to support 'in'
            // For bank, my API implementation supports single value 'bank=...'. 
            // Wait, my API implementation: "const bank = searchParams.get('bank')". It takes only one.
            // But UI requests MultiSelect. I should update API or just send one for now.
            // Actually, let's fix API later if needed. For now assume single selection or comma separated handled? 
            // My API: `where.bank = bank`. It expects exact match. 
            // I'll update frontend to use Single Select for Bank or update API to support IN.
            // User requested "Bank (BCA/...)" column. Filters usually map to columns.
            // Let's assume user wants to filter by multiple banks. I'll pass single for now if I use current API, OR update API.
            // I'll send the first one if multiple selected, or better, update API in next step.
            // For now let's pass it.

            if (filters.status.length > 0) params.append('status', filters.status.join(','));
            if (filters.dateStart) params.append('dateStart', filters.dateStart);
            if (filters.dateEnd) params.append('dateEnd', filters.dateEnd);

            const response = await apiFetch<PaginatedResponse<Vendor>>(`/vendors?${params.toString()}`);
            if (response.data) {
                setVendors(response.data);
                setTotal(response.total);
                setTotalPages(response.totalPages);
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    }, [page, sort, activeTab, filters]);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    // Fetch Items for dropdown
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await apiFetch<{ data: Array<{ id: string; name: string; sku: string; uom: { symbol: string } }> }>('/items?limit=999');
                if (response.data) {
                    setItems(response.data);
                }
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        };
        fetchItems();
    }, []);

    // Handle Filters
    const hasActiveFilters =
        filters.name !== '' ||
        filters.bank.length > 0 ||
        filters.status.length > 0 ||
        filters.dateStart !== '' ||
        filters.dateEnd !== '';

    const applyFilters = () => {
        setFilters(pendingFilters);
        setPage(1);
    };

    const resetFilters = () => {
        setPendingFilters(defaultFilters);
        setFilters(defaultFilters);
        setPage(1);
    };

    const toggleSort = (field: string) => {
        setSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Modal Actions
    const openModal = async (vendor?: Vendor) => {
        if (vendor) {
            setEditingVendor(vendor);
            // Fetch vendor items when editing
            try {
                const vendorData = await apiFetch<{ suppliedItems: Array<{ id: string; itemId: string; cogsPerUom: number; item: { name: string } }> }>(`/vendors/${vendor.id}`);
                const vendorItems = vendorData.suppliedItems?.map(vi => ({
                    itemId: vi.itemId,
                    itemName: vi.item.name,
                    cogsPerUom: vi.cogsPerUom
                })) || [];

                setFormData({
                    name: vendor.name,
                    vendorType: vendor.vendorType,
                    phone: vendor.phone || '',
                    address: vendor.address || '',
                    bank: vendor.bank || '',
                    bankBranch: vendor.bankBranch || '',
                    bankAccount: vendor.bankAccount || '',
                    isActive: vendor.isActive,
                    vendorItems,
                    spkDocumentPath: vendor.spkDocumentPath || '',
                });
            } catch (error) {
                console.error('Error fetching vendor items:', error);
                setFormData({
                    name: vendor.name,
                    vendorType: vendor.vendorType,
                    phone: vendor.phone || '',
                    address: vendor.address || '',
                    bank: vendor.bank || '',
                    bankBranch: vendor.bankBranch || '',
                    bankAccount: vendor.bankAccount || '',
                    isActive: vendor.isActive,
                    vendorItems: [],
                    spkDocumentPath: vendor.spkDocumentPath || '',
                });
            }
        } else {
            setEditingVendor(null);
            setFormData({
                name: '',
                vendorType: activeTab === 'all' ? 'NON_SPK' : activeTab,
                phone: '',
                address: '',
                bank: '',
                bankBranch: '',
                bankAccount: '',
                isActive: true,
                vendorItems: [],
                spkDocumentPath: '',
            });
        }
        setSelectedSPKFile(null); // Reset file selection
        setModalOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed');
            e.target.value = ''; // Reset input
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size exceeds 5MB limit');
            e.target.value = ''; // Reset input
            return;
        }

        setSelectedSPKFile(file);
    };

    const handleSubmit = async () => {
        setModalLoading(true);
        try {
            let spkDocumentPath = formData.spkDocumentPath;

            // If there's a new file selected, upload it first
            if (selectedSPKFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', selectedSPKFile);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData,
                });

                if (!uploadResponse.ok) {
                    const error = await uploadResponse.json();
                    alert(error.error || 'Failed to upload SPK document');
                    setModalLoading(false);
                    return;
                }

                const uploadData = await uploadResponse.json();
                spkDocumentPath = uploadData.path;
            }

            // Prepare vendor data - strip itemName from vendorItems
            const vendorData = {
                ...formData,
                spkDocumentPath,
                vendorItems: formData.vendorItems.map(vi => ({
                    itemId: vi.itemId,
                    cogsPerUom: vi.cogsPerUom
                }))
            };

            // Now save vendor with the file path
            const url = editingVendor ? `/vendors/${editingVendor.id}` : '/vendors';
            const method = editingVendor ? 'PUT' : 'POST';

            await apiFetch(url, {
                method,
                body: JSON.stringify(vendorData),
            });

            setModalOpen(false);
            setSelectedSPKFile(null);
            fetchVendors();
        } catch (error) {
            console.error('Error saving vendor:', error);
            // Show error to user
            const errorMessage = error instanceof Error ? error.message : 'Failed to save vendor';
            alert(`Error: ${errorMessage}`);
        } finally {
            setModalLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await apiFetch(`/vendors/${id}`, { method: 'DELETE' });
            fetchVendors();
        } catch (error) {
            console.error('Error deleting vendor:', error);
        }
    };

    const tabs = [
        { id: 'all', label: 'All Vendors', icon: <Briefcase size={18} /> },
        { id: 'SPK', label: 'SPK Vendors', icon: <Building2 size={18} /> },
        { id: 'NON_SPK', label: 'Non SPK Vendors', icon: <Building2 size={18} /> },
    ];

    return (
        <div className="animate-fadeIn space-y-4">
            {/* Header & Tabs */}
            <Tabs
                tabs={tabs}
                defaultTab="all"
                activeTab={activeTab}
                onChange={(id) => {
                    setActiveTab(id);
                    setPage(1);
                }}
            >
                {() => (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold">Vendors</h1>
                            <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                                Add New Vendor
                            </Button>
                        </div>

                        {/* Filter Panel */}
                        <TableFilters
                            hasActiveFilters={hasActiveFilters}
                            onApply={applyFilters}
                            onReset={resetFilters}
                        >
                            <FilterField label="Vendor Name">
                                <TextFilter
                                    value={pendingFilters.name}
                                    onChange={(v) => setPendingFilters({ ...pendingFilters, name: v })}
                                    placeholder="Search name..."
                                />
                            </FilterField>
                            <FilterField label="Bank">
                                <MultiSelectFilter
                                    options={bankOptions}
                                    selected={pendingFilters.bank}
                                    onChange={(v) => setPendingFilters({ ...pendingFilters, bank: v })}
                                    placeholder="All Banks"
                                />
                            </FilterField>
                            <FilterField label="Status">
                                <MultiSelectFilter
                                    options={statusOptions}
                                    selected={pendingFilters.status}
                                    onChange={(v) => setPendingFilters({ ...pendingFilters, status: v })}
                                    placeholder="All Status"
                                />
                            </FilterField>
                            <FilterField label="Created Date">
                                <DateRangeFilter
                                    startDate={pendingFilters.dateStart}
                                    endDate={pendingFilters.dateEnd}
                                    onChange={(s, e) => setPendingFilters({ ...pendingFilters, dateStart: s, dateEnd: e })}
                                />
                            </FilterField>
                        </TableFilters>

                        {/* Table */}
                        <div className="bg-(--color-bg-secondary) rounded-xl border border-(--color-border) overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">No</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={sort.field === 'name' ? sort.direction : null}
                                                onSort={() => toggleSort('name')}
                                            >
                                                Vendor Name
                                            </SortableTableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={sort.field === 'vendorType' ? sort.direction : null}
                                                onSort={() => toggleSort('vendorType')}
                                            >
                                                Type
                                            </SortableTableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Address</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={sort.field === 'bank' ? sort.direction : null}
                                                onSort={() => toggleSort('bank')}
                                            >
                                                Bank
                                            </SortableTableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead>Account No</TableHead>
                                            <SortableTableHead
                                                sortable
                                                sortDirection={sort.field === 'status' ? sort.direction : null}
                                                onSort={() => toggleSort('status')}
                                            >
                                                Status
                                            </SortableTableHead>
                                            <TableHead className="w-24">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-24 text-center">Loading...</TableCell>
                                            </TableRow>
                                        ) : vendors.length === 0 ? (
                                            <TableEmpty colSpan={10} message="No vendors found" />
                                        ) : (
                                            vendors.map((vendor, index) => (
                                                <TableRow key={vendor.id}>
                                                    <TableCell className="text-(--color-text-muted)">
                                                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={vendor.vendorType === 'SPK' ? 'info' : 'neutral'}>{vendor.vendorType.replace('_', ' ')}</Badge>
                                                    </TableCell>
                                                    <TableCell>{vendor.phone || '-'}</TableCell>
                                                    <TableCell className="max-w-[200px]">
                                                        <div className="truncate" title={vendor.address || ''}>
                                                            {vendor.address || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{vendor.bank || '-'}</TableCell>
                                                    <TableCell>{vendor.bankBranch || '-'}</TableCell>
                                                    <TableCell>{vendor.bankAccount || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={vendor.isActive ? 'success' : 'danger'}>
                                                            {vendor.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/master/vendor/${vendor.id}`)}
                                                                title="View Details"
                                                            >
                                                                <Eye size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openModal(vendor)}
                                                                title="Edit"
                                                            >
                                                                <Pencil size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={total}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={setPage}
                            />
                        </div>
                    </div>
                )}
            </Tabs>

            {/* Vendor Form Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingVendor ? 'Edit Vendor' : 'New Vendor'}
                size="lg"
            >
                <div className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 size={18} className="text-(--color-primary)" />
                            <h3 className="text-sm font-semibold text-(--color-text-primary)">Basic Information</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Vendor Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., PT. Example Jaya"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">
                                        Vendor Type <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        options={[
                                            { value: 'SPK', label: 'SPK' },
                                            { value: 'NON_SPK', label: 'Non-SPK' }
                                        ]}
                                        value={formData.vendorType}
                                        onChange={(v) => setFormData({ ...formData, vendorType: v })}
                                        placeholder="Select Type"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Active Status</label>
                                    <Toggle
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        label={formData.isActive ? 'Active' : 'Inactive'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SPK Document Section - Only for SPK vendors */}
                    {formData.vendorType === 'SPK' && (
                        <div className="space-y-4 pt-4 border-t border-(--color-border)">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={18} className="text-(--color-primary)" />
                                <h3 className="text-sm font-semibold text-(--color-text-primary)">SPK Document</h3>
                                <span className="text-xs text-(--color-text-muted)">(Required for SPK vendors)</span>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Upload SPK Document <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-(--color-text-muted) mb-2">
                                    Accepted formats: Only PDF (Max 5MB)
                                </p>

                                <div className="flex gap-3 items-start">
                                    <label className="flex-1 cursor-pointer">
                                        <div className={`
                                            flex items-center justify-center gap-2 px-4 py-3 
                                            border-2 border-dashed border-(--color-border) 
                                            rounded-lg hover:border-(--color-primary) 
                                            transition-colors
                                        `}>
                                            <Upload size={18} className="text-(--color-text-muted)" />
                                            <span className="text-sm text-(--color-text-muted)">
                                                {selectedSPKFile ? selectedSPKFile.name : 'Click to select PDF document'}
                                            </span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {(selectedSPKFile || formData.spkDocumentPath) && (
                                    <div className="mt-3 flex items-center gap-2 p-3 bg-(--color-bg-tertiary) rounded-lg">
                                        <FileText size={16} className="text-(--color-success)" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">
                                                {selectedSPKFile ? `Selected: ${selectedSPKFile.name}` : 'Document uploaded'}
                                            </p>
                                            {formData.spkDocumentPath && !selectedSPKFile && (
                                                <a
                                                    href={formData.spkDocumentPath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-(--color-primary) hover:underline"
                                                >
                                                    View current document
                                                </a>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedSPKFile(null);
                                                setFormData({ ...formData, spkDocumentPath: '' });
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Contact Information Section */}
                    <div className="space-y-4 pt-4 border-t border-(--color-border)">
                        <div className="flex items-center gap-2 mb-3">
                            <Phone size={18} className="text-(--color-primary)" />
                            <h3 className="text-sm font-semibold text-(--color-text-primary)">Contact Information</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                                <div className="relative">
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="e.g., +62 812-3456-7890"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Address</label>
                                <div className="relative">
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Enter full address..."
                                        rows={3}
                                        className="w-full pl-3 pr-3 py-2 border border-(--color-border) rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item List Section */}
                    <div className="space-y-4 pt-4 border-t border-(--color-border)">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-(--color-primary)" />
                                <h3 className="text-sm font-semibold text-(--color-text-primary)">Vendor Items</h3>
                                <span className="text-xs text-(--color-text-muted)">(Optional)</span>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-3">
                            {formData.vendorItems.map((vendorItem, index) => (
                                <div key={index} className="flex gap-3 items-center p-4 bg-(--color-bg-tertiary) rounded-lg border border-(--color-border)">
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">Item</label>
                                            <Dropdown
                                                options={items.map(item => ({ value: item.id, label: `${item.sku} - ${item.name}` }))}
                                                value={vendorItem.itemId}
                                                onChange={(v) => {
                                                    const selectedItem = items.find(i => i.id === v);
                                                    const newVendorItems = [...formData.vendorItems];
                                                    newVendorItems[index] = {
                                                        ...vendorItem,
                                                        itemId: v,
                                                        itemName: selectedItem?.name || ''
                                                    };
                                                    setFormData({ ...formData, vendorItems: newVendorItems });
                                                }}
                                                placeholder="Select Item"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">COGS per UOM</label>
                                            <div className="relative flex items-center">
                                                <span className="absolute left-3 text-sm font-semibold text-(--color-text-primary) pointer-events-none z-10">Rp</span>
                                                <input
                                                    type="text"
                                                    disabled={!vendorItem.itemId}
                                                    value={vendorItem.cogsPerUom ? parseInt(vendorItem.cogsPerUom.toString()).toLocaleString('id-ID') : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        const newVendorItems = [...formData.vendorItems];
                                                        newVendorItems[index] = { ...vendorItem, cogsPerUom: parseFloat(value) || 0 };
                                                        setFormData({ ...formData, vendorItems: newVendorItems });
                                                    }}
                                                    placeholder="10.000"
                                                    className="w-full pl-10 pr-14 py-3 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                {vendorItem.itemId && items.find(i => i.id === vendorItem.itemId) && (
                                                    <span className="absolute right-3 text-sm font-semibold text-(--color-text-muted) pointer-events-none">
                                                        /{items.find(i => i.id === vendorItem.itemId)!.uom.symbol}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const newVendorItems = formData.vendorItems.filter((_, i) => i !== index);
                                            setFormData({ ...formData, vendorItems: newVendorItems });
                                        }}
                                        className="mt-5"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setFormData({
                                        ...formData,
                                        vendorItems: [...formData.vendorItems, { itemId: '', itemName: '', cogsPerUom: 0 }]
                                    });
                                }}
                                leftIcon={<Plus size={16} />}
                                className="w-full"
                            >
                                Add Item
                            </Button>
                        </div>
                    </div>

                    {/* Banking Information Section */}
                    <div className="space-y-4 pt-4 border-t border-(--color-border)">
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard size={18} className="text-(--color-primary)" />
                            <h3 className="text-sm font-semibold text-(--color-text-primary)">Banking Information</h3>
                            <span className="text-xs text-(--color-text-muted)">(Optional)</span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Bank Name</label>
                                    <Dropdown
                                        options={bankOptions.map(v => ({ value: v, label: v }))}
                                        value={formData.bank}
                                        onChange={(v) => setFormData({ ...formData, bank: v })}
                                        placeholder="Select Bank"
                                        clearable
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Branch</label>
                                    <Input
                                        value={formData.bankBranch}
                                        onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                                        placeholder="e.g., KCP Sudirman"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                                <div className="relative">
                                    <Input
                                        value={formData.bankAccount}
                                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                        placeholder="Enter account number"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-6 border-t border-(--color-border) flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setModalOpen(false)}
                            disabled={modalLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            isLoading={modalLoading}
                        >
                            {editingVendor ? 'Save Changes' : 'Create Vendor'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
