'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Edit, MapPin, Phone, Mail, User, CreditCard, Package, Plus, Trash2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { apiFetch } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface Vendor {
    id: string;
    code: string;
    name: string;
    vendorType: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    contactName: string | null;
    bank: string | null;
    bankBranch: string | null;
    bankAccount: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count: {
        suppliedItems: number;
    };
}

interface Item {
    id: string;
    sku: string;
    name: string;
    category: {
        id: string;
        name: string;
    };
    uom: {
        id: string;
        name: string;
        symbol: string;
    };
}

interface VendorItem {
    id: string;
    vendorId: string;
    itemId: string;
    cogsPerUom: number;
    isActive: boolean;
    createdAt: string;
    item: Item;
}

interface AddItemForm {
    itemId: string;
    cogsPerUom: string;
}

export default function VendorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params.id as string;

    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
    const [allItems, setAllItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemsLoading, setItemsLoading] = useState(false);

    // Modal states
    const [addItemModalOpen, setAddItemModalOpen] = useState(false);
    const [editCogsModalOpen, setEditCogsModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Form states
    const [addItemForm, setAddItemForm] = useState<AddItemForm>({ itemId: '', cogsPerUom: '' });
    const [editingVendorItem, setEditingVendorItem] = useState<VendorItem | null>(null);
    const [editCogs, setEditCogs] = useState('');
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

    // Fetch vendor details
    const fetchVendor = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiFetch<Vendor>(`/vendors/${vendorId}`);
            setVendor(data);
        } catch (error) {
            console.error('Failed to fetch vendor:', error);
        } finally {
            setLoading(false);
        }
    }, [vendorId]);

    // Fetch vendor items
    const fetchVendorItems = useCallback(async () => {
        try {
            setItemsLoading(true);
            const response = await apiFetch<{ data: VendorItem[] }>(`/vendors/${vendorId}/items?limit=100`);
            setVendorItems(response.data);
        } catch (error) {
            console.error('Failed to fetch vendor items:', error);
        } finally {
            setItemsLoading(false);
        }
    }, [vendorId]);

    // Fetch all items for dropdown
    const fetchAllItems = useCallback(async () => {
        try {
            const response = await apiFetch<{ data: Item[] }>('/items?limit=1000');
            setAllItems(response.data);
        } catch (error) {
            console.error('Failed to fetch items:', error);
        }
    }, []);

    useEffect(() => {
        fetchVendor();
        fetchVendorItems();
        fetchAllItems();
    }, [fetchVendor, fetchVendorItems, fetchAllItems]);

    // Add item to vendor
    const handleAddItem = async () => {
        if (!addItemForm.itemId || !addItemForm.cogsPerUom) {
            alert('Please select an item and enter COGS');
            return;
        }

        const cogsValue = parseFloat(addItemForm.cogsPerUom);
        if (isNaN(cogsValue) || cogsValue < 0) {
            alert('Please enter a valid positive number for COGS');
            return;
        }

        try {
            await apiFetch(`/vendors/${vendorId}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    itemId: addItemForm.itemId,
                    cogsPerUom: cogsValue,
                }),
            });
            setAddItemModalOpen(false);
            setAddItemForm({ itemId: '', cogsPerUom: '' });
            fetchVendorItems();
            fetchVendor(); // Refresh count
        } catch (error) {
            console.error('Failed to add item:', error);
            alert('Failed to add item. Please try again.');
        }
    };

    // Update COGS
    const handleUpdateCogs = async () => {
        if (!editingVendorItem || !editCogs) {
            alert('Please enter a valid COGS');
            return;
        }

        const cogsValue = parseFloat(editCogs);
        if (isNaN(cogsValue) || cogsValue < 0) {
            alert('Please enter a valid positive number for COGS');
            return;
        }

        try {
            await apiFetch(`/vendors/${vendorId}/items/${editingVendorItem.itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ cogsPerUom: cogsValue }),
            });
            setEditCogsModalOpen(false);
            setEditingVendorItem(null);
            setEditCogs('');
            fetchVendorItems();
        } catch (error) {
            console.error('Failed to update COGS:', error);
            alert('Failed to update COGS. Please try again.');
        }
    };

    // Delete item from vendor
    const handleDeleteItem = async () => {
        if (!deletingItemId) return;

        try {
            await apiFetch(`/vendors/${vendorId}/items/${deletingItemId}`, {
                method: 'DELETE',
            });
            setDeleteConfirmOpen(false);
            setDeletingItemId(null);
            fetchVendorItems();
            fetchVendor(); // Refresh count
        } catch (error) {
            console.error('Failed to delete item:', error);
            alert('Failed to remove item. Please try again.');
        }
    };

    const openEditCogsModal = (vendorItem: VendorItem) => {
        setEditingVendorItem(vendorItem);
        setEditCogs(vendorItem.cogsPerUom.toString());
        setEditCogsModalOpen(true);
    };

    const openDeleteConfirm = (itemId: string) => {
        setDeletingItemId(itemId);
        setDeleteConfirmOpen(true);
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">Loading...</div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="p-6">
                <div className="text-center py-12">Vendor not found</div>
            </div>
        );
    }

    const availableItems = allItems.filter(
        item => !vendorItems.some(vi => vi.itemId === item.id)
    );

    const selectedItem = allItems.find(item => item.id === addItemForm.itemId);

    return (
        <div className="p-8">
            {/* Header with Better Spacing */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/master/vendor')}
                        className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                        <ArrowLeft size={18} />
                        Back to Vendors
                    </Button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold">{vendor.name}</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant={vendor.isActive ? 'success' : 'danger'}>
                                {vendor.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="info">{vendor.vendorType}</Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vendor Information Card with Better Organization */}
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-sm mb-6">
                <div className="p-6 border-b border-[var(--color-border)]">
                    <h2 className="text-xl font-semibold">Vendor Information</h2>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Contact Information Section */}
                        <div className="space-y-5">
                            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
                                Contact Details
                            </h3>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                    <Building2 size={18} className="text-[var(--color-primary)]" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-[var(--color-text-muted)] mb-1">Vendor Code</div>
                                    <div className="font-mono font-medium">{vendor.code}</div>
                                </div>
                            </div>

                            {vendor.phone && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                        <Phone size={18} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-[var(--color-text-muted)] mb-1">Phone Number</div>
                                        <div className="font-medium">{vendor.phone}</div>
                                    </div>
                                </div>
                            )}

                            {vendor.email && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                        <Mail size={18} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-[var(--color-text-muted)] mb-1">Email Address</div>
                                        <div className="font-medium">{vendor.email}</div>
                                    </div>
                                </div>
                            )}

                            {vendor.contactName && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                        <User size={18} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-[var(--color-text-muted)] mb-1">Contact Person</div>
                                        <div className="font-medium">{vendor.contactName}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Address Section */}
                        <div className="space-y-5">
                            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
                                Location
                            </h3>

                            {vendor.address ? (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                        <MapPin size={18} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-[var(--color-text-muted)] mb-1">Address</div>
                                        <div className="font-medium leading-relaxed">{vendor.address}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-[var(--color-text-muted)] italic">No address provided</div>
                            )}
                        </div>

                        {/* Banking & Stats Section */}
                        <div className="space-y-5">
                            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
                                Banking & Statistics
                            </h3>

                            {vendor.bank && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                        <CreditCard size={18} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-[var(--color-text-muted)] mb-1">Bank Details</div>
                                        <div className="font-medium">{vendor.bank}</div>
                                        {vendor.bankBranch && (
                                            <div className="text-sm text-[var(--color-text-muted)] mt-1">{vendor.bankBranch}</div>
                                        )}
                                        {vendor.bankAccount && (
                                            <div className="text-sm font-mono mt-1">{vendor.bankAccount}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
                                    <Package size={18} className="text-[var(--color-primary)]" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-[var(--color-text-muted)] mb-1">Items Supplied</div>
                                    <div className="text-2xl font-bold text-[var(--color-primary)]">
                                        {vendor._count.suppliedItems}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)] rounded-b-xl">
                    <div className="flex items-center gap-6 text-xs text-[var(--color-text-muted)]">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Created:</span>
                            <span>{formatDate(vendor.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Last Updated:</span>
                            <span>{formatDate(vendor.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Supplied Items Card with Better Table */}
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-sm">
                <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Supplied Items</h2>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">
                            Manage items supplied by this vendor
                        </p>
                    </div>
                    <Button onClick={() => setAddItemModalOpen(true)} size="sm">
                        <Plus size={16} className="mr-2" />
                        Add Item
                    </Button>
                </div>

                <div className="p-6">
                    {itemsLoading ? (
                        <div className="text-center py-12 text-[var(--color-text-muted)]">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mb-4"></div>
                            <p>Loading items...</p>
                        </div>
                    ) : vendorItems.length === 0 ? (
                        <div className="text-center py-16 text-[var(--color-text-muted)]">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-bg-tertiary)] rounded-full mb-4">
                                <Package size={32} className="opacity-50" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No items added yet</h3>
                            <p className="text-sm">Click "Add Item" to start adding items this vendor supplies</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>UOM</TableHead>
                                        <TableHead>COGS per UOM</TableHead>
                                        <TableHead>Added Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendorItems.map((vendorItem) => (
                                        <TableRow key={vendorItem.id}>
                                            <TableCell className="font-mono text-sm">{vendorItem.item.sku}</TableCell>
                                            <TableCell className="font-medium">{vendorItem.item.name}</TableCell>
                                            <TableCell>{vendorItem.item.category.name}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-sm">
                                                    {vendorItem.item.uom.symbol}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-semibold text-[var(--color-primary)]">
                                                Rp {vendorItem.cogsPerUom.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-sm text-[var(--color-text-muted)]">
                                                {formatDate(vendorItem.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditCogsModal(vendorItem)}
                                                        className="hover:bg-[var(--color-bg-tertiary)]"
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openDeleteConfirm(vendorItem.itemId)}
                                                        className="hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-danger)]"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>


            {/* Add Item Modal */}
            <Modal
                isOpen={addItemModalOpen}
                onClose={() => {
                    setAddItemModalOpen(false);
                    setAddItemForm({ itemId: '', cogsPerUom: '' });
                }}
                title="Add Item to Vendor"
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Select Item</label>
                        <Dropdown
                            options={availableItems.map(item => ({
                                value: item.id,
                                label: `${item.sku} - ${item.name}`
                            }))}
                            value={addItemForm.itemId}
                            onChange={(value) => setAddItemForm({ ...addItemForm, itemId: value })}
                            placeholder="Select an item..."
                        />
                        {selectedItem && (
                            <div className="mt-2 text-sm text-[var(--color-text-muted)]">
                                UOM: {selectedItem.uom.name} ({selectedItem.uom.symbol})
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">COGS per UOM (Rp)</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={addItemForm.cogsPerUom}
                                onChange={(e) => setAddItemForm({ ...addItemForm, cogsPerUom: e.target.value })}
                                placeholder="Enter cost..."
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setAddItemModalOpen(false);
                                setAddItemForm({ itemId: '', cogsPerUom: '' });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddItem}>
                            Add Item
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit COGS Modal */}
            <Modal
                isOpen={editCogsModalOpen}
                onClose={() => {
                    setEditCogsModalOpen(false);
                    setEditingVendorItem(null);
                    setEditCogs('');
                }}
                title="Edit COGS"
            >
                {editingVendorItem && (
                    <div className="space-y-4">
                        <div>
                            <div className="text-sm text-[var(--color-text-muted)]">Item</div>
                            <div className="font-medium">{editingVendorItem.item.name}</div>
                            <div className="text-sm text-[var(--color-text-muted)] mt-1">
                                UOM: {editingVendorItem.item.uom.name} ({editingVendorItem.item.uom.symbol})
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">COGS per UOM (Rp)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editCogs}
                                    onChange={(e) => setEditCogs(e.target.value)}
                                    placeholder="Enter cost..."
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setEditCogsModalOpen(false);
                                    setEditingVendorItem(null);
                                    setEditCogs('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateCogs}>
                                Update COGS
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setDeletingItemId(null);
                }}
                title="Remove Item"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to remove this item from the vendor's supply list?</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setDeleteConfirmOpen(false);
                                setDeletingItemId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDeleteItem}>
                            Remove
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
