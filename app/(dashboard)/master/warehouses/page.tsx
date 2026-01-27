'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Pencil, Trash2, Warehouse as WarehouseIcon, RefreshCw, Package, X, Check } from 'lucide-react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    Modal,
    TableFilters,
    FilterField,
    MultiSelectFilter,
    TextFilter,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, getWarehouseItems, assignItemsToWarehouse, unassignItemFromWarehouse } from '@/app/actions/warehouses';
import { getItemsForPicker } from '@/app/actions/items';
import { useToast } from '@/components/ui/use-toast';

export default function WarehousesPage() {
    const { toast } = useToast();
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '', // kept for edit mode display
        name: '',
        address: '',
        type: 'BRANCH',
        isDefault: false,
        isActive: true
    });

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        types: [] as string[],
        status: [] as string[]
    });
    const [pendingFilters, setPendingFilters] = useState(filters);

    // Item Management State
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
    const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [itemSearch, setItemSearch] = useState('');
    const [itemsLoading, setItemsLoading] = useState(false);

    const fetchWarehouses = async () => {
        setLoading(true);
        const res = await getWarehouses();
        if (res.success) {
            setWarehouses(res.data as any[]);
        }
        setLoading(false);
    };



    useEffect(() => {
        fetchWarehouses();
    }, []);

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            address: '',
            type: 'BRANCH', // MAIN is usually singleton
            isDefault: false,
            isActive: true
        });
        setIsEditing(false);
        setCurrentId(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setFormData(prev => ({ ...prev, code: '' })); // Ensure code is empty for new
        setIsModalOpen(true);
    };

    const handleOpenEdit = (wh: any) => {
        setFormData({
            code: wh.code,
            name: wh.name,
            address: wh.address || '',
            type: wh.type,
            isDefault: wh.isDefault,
            isActive: wh.isActive
        });
        setIsEditing(true);
        setCurrentId(wh.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let res;
            if (isEditing && currentId) {
                res = await updateWarehouse(currentId, formData);
            } else {
                res = await createWarehouse(formData);
            }

            if (res.success) {
                toast({ title: "Success", description: "Warehouse saved successfully", variant: "success" });
                setIsModalOpen(false);
                fetchWarehouses();
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } catch (error) {
            console.error('Failed to save:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure? This cannot be undone if stocks exist.')) {
            const res = await deleteWarehouse(id);
            if (res.success) {
                toast({ title: "Deleted", description: "Warehouse deleted", variant: "success" });
                fetchWarehouses();
            } else {
                toast({ title: "Failed", description: res.error, variant: "destructive" });
            }
        }
    };

    // Item Management Handlers
    const handleOpenItems = async (wh: any) => {
        setSelectedWarehouse(wh);
        setIsItemsModalOpen(true);
        setItemsLoading(true);

        // Fetch assigned items
        const assignedRes = await getWarehouseItems(wh.id);
        if (assignedRes.success) setWarehouseItems(assignedRes.data || []);

        // Fetch all items for picker
        const itemsRes = await getItemsForPicker();
        if (itemsRes.success) setAvailableItems(itemsRes.data);

        setItemsLoading(false);
    };

    const handleAssignItem = async (itemId: string) => {
        if (!selectedWarehouse) return;
        const res = await assignItemsToWarehouse(selectedWarehouse.id, [itemId]);
        if (res.success) {
            toast({ title: "Assigned", description: "Item assigned to warehouse", variant: "success" });
            const updated = await getWarehouseItems(selectedWarehouse.id); // Refresh list
            if (updated.success) setWarehouseItems(updated.data || []);
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    };

    const handleUnassignItem = async (itemId: string) => {
        if (!selectedWarehouse) return;
        const res = await unassignItemFromWarehouse(selectedWarehouse.id, itemId);
        if (res.success) {
            toast({ title: "Removed", description: "Item unassigned from warehouse", variant: "success" });
            const updated = await getWarehouseItems(selectedWarehouse.id); // Refresh list
            if (updated.success) setWarehouseItems(updated.data || []);
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    };

    const filtered = warehouses.filter(w => {
        const matchesSearch = w.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            w.code.toLowerCase().includes(filters.search.toLowerCase());
        const matchesType = filters.types.length === 0 || filters.types.includes(w.type);
        const matchesStatus = filters.status.length === 0 ||
            (filters.status.includes('Active') && w.isActive) ||
            (filters.status.includes('Inactive') && !w.isActive);

        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Warehouses</h1>
                    <p className="text-(--color-text-muted)">Manage stock locations and branches.</p>
                </div>
                <div className="flex gap-2">

                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Warehouse
                    </Button>
                </div>
            </div>

            <TableFilters
                hasActiveFilters={!!filters.search || filters.types.length > 0 || filters.status.length > 0}
                onApply={() => setFilters(pendingFilters)}
                onReset={() => {
                    setFilters({ search: '', types: [], status: [] });
                    setPendingFilters({ search: '', types: [], status: [] });
                }}
            >
                <FilterField label="Search">
                    <TextFilter
                        value={pendingFilters.search}
                        onChange={(v) => setPendingFilters(prev => ({ ...prev, search: v }))}
                        placeholder="Search warehouses..."
                    />
                </FilterField>
                <FilterField label="Type">
                    <MultiSelectFilter
                        options={['MAIN', 'BRANCH']}
                        selected={pendingFilters.types}
                        onChange={(vals) => setPendingFilters(prev => ({ ...prev, types: vals }))}
                        placeholder="All Types"
                    />
                </FilterField>
                <FilterField label="Status">
                    <MultiSelectFilter
                        options={['Active', 'Inactive']}
                        selected={pendingFilters.status}
                        onChange={(vals) => setPendingFilters(prev => ({ ...prev, status: vals }))}
                        placeholder="All Status"
                    />
                </FilterField>
            </TableFilters>

            <div className="border border-(--color-border) rounded-md shadow-sm bg-(--color-bg-card) overflow-hidden">
                <Table>
                    <TableHeader className="bg-(--color-bg-secondary)">
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableEmpty colSpan={6} message="Loading..." />
                        ) : filtered.length === 0 ? (
                            <TableEmpty colSpan={6} message="No warehouses found. Click 'Add Warehouse' to create one." />
                        ) : (
                            filtered.map((wh) => (
                                <TableRow key={wh.id} className="hover:bg-(--color-bg-secondary)">
                                    <TableCell className="font-mono flex items-center gap-2">
                                        <WarehouseIcon size={14} className="text-(--color-text-muted)" />
                                        {wh.code}
                                        {wh.isDefault && <Badge variant="info" className="ml-2 text-xs">Default</Badge>}
                                    </TableCell>
                                    <TableCell className="font-medium">{wh.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={wh.type === 'MAIN' ? 'info' : 'neutral'}>
                                            {wh.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-(--color-text-muted) max-w-[200px] truncate">
                                        {wh.address || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={wh.isActive ? 'success' : 'neutral'}>
                                            {wh.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(wh)}>
                                                <Pencil size={16} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenItems(wh)} title="Manage Items">
                                                <Package size={16} />
                                            </Button>
                                            {!wh.isDefault && (
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(wh.id)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Warehouse' : 'Add New Warehouse'}
                footer={
                    <>
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save</Button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {isEditing && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Code</label>
                                <Input value={formData.code} disabled placeholder="e.g. WH-002" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Branch Jakarta" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="BRANCH">Branch</option>
                                <option value="MAIN">Main</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex items-center gap-2 border p-2 rounded h-10">
                                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                                <span className="text-sm">Active</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Address</label>
                        <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                </form>
            </Modal>

            {/* Manage Items Modal */}
            <Modal
                isOpen={isItemsModalOpen}
                onClose={() => setIsItemsModalOpen(false)}
                title={`Manage Items: ${selectedWarehouse?.name}`}
                size="4xl"
            >
                <div className="flex gap-4 h-[500px]">
                    {/* Left: Assigned Items */}
                    <div className="flex-1 border border-(--color-border) rounded-md p-4 bg-(--color-bg-secondary) flex flex-col">
                        <h3 className="font-medium mb-4 flex items-center justify-between text-(--color-text-primary)">
                            <span>Assigned Items ({warehouseItems.length})</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {warehouseItems.length === 0 ? (
                                <div className="text-center text-(--color-text-muted) py-8">No items assigned yet.</div>
                            ) : (
                                warehouseItems.map((sock) => (
                                    <div key={sock.itemId} className="flex items-center justify-between bg-(--color-bg-card) p-3 rounded border border-(--color-border) shadow-sm">
                                        <div>
                                            <div className="font-medium text-sm text-(--color-text-primary)">{sock.item.name}</div>
                                            <div className="text-xs text-(--color-text-muted)">{sock.item.sku}</div>
                                            {sock.quantity > 0 && <Badge variant="info" className="mt-1 text-[10px]">{sock.quantity} stock</Badge>}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                                            onClick={() => handleUnassignItem(sock.itemId)}
                                            disabled={sock.quantity > 0}
                                        >
                                            <X size={16} />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Available Items */}
                    <div className="flex-1 border border-(--color-border) rounded-md p-4 flex flex-col bg-(--color-bg-card)">
                        <h3 className="font-medium mb-4 text-(--color-text-primary)">Add Items</h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                            <Input
                                placeholder="Search available items..."
                                className="pl-8"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {itemsLoading ? (
                                <div className="text-center py-8 text-(--color-text-muted)">Loading...</div>
                            ) : (
                                availableItems
                                    .filter(i =>
                                        !warehouseItems.some(wi => wi.itemId === i.id) &&
                                        (i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase()))
                                    )
                                    .slice(0, 50) // Limit display
                                    .map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 hover:bg-(--color-bg-secondary) rounded border border-transparent hover:border-(--color-border) cursor-pointer group transition-colors" onClick={() => handleAssignItem(item.id)}>
                                            <div>
                                                <div className="font-medium text-sm text-(--color-text-primary)">{item.name}</div>
                                                <div className="text-xs text-(--color-text-muted)">{item.sku}</div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                                                <Plus size={16} />
                                            </Button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
