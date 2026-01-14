'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Edit, MapPin, Phone, Mail, User, CreditCard, Package, Plus, Trash2, DollarSign, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
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
    spkDocumentPath: string | null;
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
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/master/vendor')}
                        className="flex items-center gap-2 text-(--color-text-muted) hover:text-(--color-text-primary)"
                    >
                        <ArrowLeft size={18} />
                        Back to Vendors
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold">{vendor.name}</h1>
                    <Badge variant={vendor.isActive ? 'success' : 'danger'}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="info">{vendor.vendorType}</Badge>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Vendor Information - Sticky */}
                <div className="lg:col-span-4">
                    <div className="bg-(--color-bg-secondary) border border-(--color-border) rounded-xl shadow-sm sticky top-6">
                        <div className="p-6 border-b border-(--color-border)">
                            <h2 className="text-xl font-semibold">Vendor Details</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Vendor Code */}
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                                    <Building2 size={24} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Vendor Code</div>
                                    <div className="text-lg font-bold font-mono">{vendor.code}</div>
                                </div>
                            </div>

                            {/* Contact Person */}
                            {vendor.contactName && (
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-orange-500 bg-opacity-10 rounded-lg">
                                        <User size={20} className="text-orange-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-(--color-text-muted) mb-1">Contact Person</div>
                                        <div className="text-sm font-medium">{vendor.contactName}</div>
                                    </div>
                                </div>
                            )}

                            {/* Phone */}
                            {vendor.phone && (
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
                                        <Phone size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-(--color-text-muted) mb-1">Phone Number</div>
                                        <div className="text-sm font-medium">{vendor.phone}</div>
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            {vendor.email && (
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-500 bg-opacity-10 rounded-lg">
                                        <Mail size={20} className="text-purple-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-(--color-text-muted) mb-1">Email Address</div>
                                        <div className="text-sm font-medium break-all">{vendor.email}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Address Section */}
                        <div className="px-6 pb-6">
                            <div className="border-t border-(--color-border) pt-6">
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <MapPin size={16} />
                                    Address
                                </h3>
                                {vendor.address ? (
                                    <p className="text-sm text-(--color-text-muted) leading-relaxed">{vendor.address}</p>
                                ) : (
                                    <p className="text-sm text-(--color-text-muted) italic">No address provided</p>
                                )}
                            </div>
                        </div>

                        {/* Banking Information */}
                        {vendor.bank && (
                            <div className="px-6 pb-6">
                                <div className="border-t border-(--color-border) pt-6">
                                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                        <CreditCard size={16} />
                                        Banking Information
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-xs text-(--color-text-muted) mb-1">Bank Name</div>
                                            <div className="text-sm font-medium">{vendor.bank}</div>
                                        </div>
                                        {vendor.bankBranch && (
                                            <div>
                                                <div className="text-xs text-(--color-text-muted) mb-1">Branch</div>
                                                <div className="text-sm font-medium">{vendor.bankBranch}</div>
                                            </div>
                                        )}
                                        {vendor.bankAccount && (
                                            <div>
                                                <div className="text-xs text-(--color-text-muted) mb-1">Account Number</div>
                                                <div className="text-sm font-mono font-medium">{vendor.bankAccount}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SPK Document */}
                        {vendor.vendorType === 'SPK' && vendor.spkDocumentPath && (
                            <div className="px-6 pb-6">
                                <div className="border-t border-(--color-border) pt-6">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <FileText size={16} />
                                        SPK Document
                                    </h3>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => window.open(vendor.spkDocumentPath ?? '', '_blank')}
                                        leftIcon={<FileText size={16} />}
                                        className="w-full"
                                    >
                                        View Document
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-6 py-4 bg-(--color-bg-tertiary) border-t border-(--color-border) rounded-b-xl">
                            <div className="space-y-2 text-xs text-(--color-text-muted)">
                                <div className="flex justify-between">
                                    <span>Created:</span>
                                    <span>{formatDate(vendor.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span>{formatDate(vendor.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tabbed Content */}
                <div className="lg:col-span-8">
                    <div className="bg-(--color-bg-secondary) border border-(--color-border) rounded-xl shadow-sm">
                        <Tabs
                            tabs={[
                                { id: 'items', label: 'Supplied Items', icon: <Package size={16} /> },
                                { id: 'purchases', label: 'Purchase History', icon: <DollarSign size={16} /> },
                                { id: 'prices', label: 'Price History', icon: <FileText size={16} /> },
                            ]}
                            defaultTab="items"
                        >
                            {(activeTab) => (
                                <div className="p-6">
                                    {activeTab === 'items' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold">Supplied Items</h3>
                                                    <p className="text-sm text-(--color-text-muted) mt-1">
                                                        Manage items supplied by this vendor
                                                    </p>
                                                </div>
                                                <Button onClick={() => setAddItemModalOpen(true)} size="sm">
                                                    <Plus size={16} className="mr-2" />
                                                    Add Item
                                                </Button>
                                            </div>

                                            {itemsLoading ? (
                                                <div className="text-center py-12 text-(--color-text-muted)">
                                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary) mb-4"></div>
                                                    <p>Loading items...</p>
                                                </div>
                                            ) : vendorItems.length === 0 ? (
                                                <div className="text-center py-16 text-(--color-text-muted)">
                                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-(--color-bg-tertiary) rounded-full mb-4">
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
                                                                        <span className="px-2 py-1 bg-(--color-bg-tertiary) rounded text-sm">
                                                                            {vendorItem.item.uom.symbol}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="font-semibold text-(--color-primary)">
                                                                        Rp {vendorItem.cogsPerUom.toLocaleString('id-ID')}
                                                                    </TableCell>
                                                                    <TableCell className="text-sm text-(--color-text-muted)">
                                                                        {formatDate(vendorItem.createdAt)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-1">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={() => openEditCogsModal(vendorItem)}
                                                                                className="hover:bg-(--color-bg-tertiary)"
                                                                            >
                                                                                <Edit size={16} />
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={() => openDeleteConfirm(vendorItem.itemId)}
                                                                                className="hover:bg-(--color-bg-tertiary) hover:text-(--color-danger)"
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
                                    )}

                                    {activeTab === 'purchases' && (
                                        <div className="text-center py-16 text-(--color-text-muted)">
                                            <DollarSign size={48} className="mx-auto mb-4 opacity-40" />
                                            <h3 className="text-lg font-medium mb-2">Purchase History</h3>
                                            <p className="text-sm">Coming soon - View all purchases from this vendor</p>
                                        </div>
                                    )}

                                    {activeTab === 'prices' && (
                                        <div className="text-center py-16 text-(--color-text-muted)">
                                            <FileText size={48} className="mx-auto mb-4 opacity-40" />
                                            <h3 className="text-lg font-medium mb-2">Price History</h3>
                                            <p className="text-sm">Coming soon - Track price changes over time</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Tabs>
                    </div>
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
                            <div className="mt-2 text-sm text-(--color-text-muted)">
                                UOM: {selectedItem.uom.name} ({selectedItem.uom.symbol})
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">COGS per UOM</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-sm font-semibold text-(--color-text-primary) pointer-events-none z-10">Rp</span>
                            <input
                                disabled={!addItemForm.itemId}
                                type="text"
                                value={addItemForm.cogsPerUom ? parseInt(addItemForm.cogsPerUom.toString()).toLocaleString('id-ID') : ''}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setAddItemForm({ ...addItemForm, cogsPerUom: value });
                                }}
                                placeholder="10.000"
                                className="w-full pl-12 pr-20 py-2.5 border border-(--color-border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {selectedItem && (
                                <span className="absolute right-4 text-sm font-semibold text-(--color-text-muted) pointer-events-none">
                                    /{selectedItem.uom.symbol}
                                </span>
                            )}
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
                            <div className="text-sm text-(--color-text-muted)">Item</div>
                            <div className="font-medium">{editingVendorItem.item.name}</div>
                            <div className="text-sm text-(--color-text-muted) mt-1">
                                UOM: {editingVendorItem.item.uom.name} ({editingVendorItem.item.uom.symbol})
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">COGS per UOM</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 text-sm font-semibold text-(--color-text-primary) pointer-events-none z-10">Rp</span>
                                <input
                                    disabled={!editingVendorItem}
                                    type="text"
                                    value={editCogs ? parseInt(editCogs.toString()).toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                        setEditCogs(value);
                                    }}
                                    placeholder="10.000"
                                    className="w-full pl-12 pr-20 py-2.5 border border-(--color-border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className="absolute right-4 text-sm font-semibold text-(--color-text-muted) pointer-events-none">
                                    /{editingVendorItem.item.uom.symbol}
                                </span>
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
