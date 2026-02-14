'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Edit, MapPin, Phone, Mail, User, CreditCard, Package, Plus, Trash2, DollarSign, FileText, Image as ImageIcon, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { apiFetch } from '@/lib/utils';
import { getVendorPurchaseHistory, getVendorPriceHistory } from '@/app/actions/vendors';
import { formatDate } from '@/lib/format';

interface Vendor {
    id: string;
    code: string;
    name: string;
    vendorType: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    link: string | null;
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
    link: string | null;
    isActive: boolean;
    createdAt: string;
    item: Item & { imagePath: string | null };
}

interface PurchaseHistoryItem {
    id: string;
    prNumber: string;
    requestDate: string;
    status: string;
    totalAmount: number;
    poNumber: string | null;
    inbounds: { grnNumber: string }[];
}

interface PriceHistoryItem {
    id: string;
    date: string;
    itemId: string;
    sku: string;
    itemName: string;
    uom: string;
    price: number;
    prNumber: string;
    poNumber: string | null;
}

interface AddItemForm {
    itemId: string;
    cogsPerUom: string;
    link: string;
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
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedPriceItemId, setSelectedPriceItemId] = useState<string>('');

    // Modal states
    const [addItemModalOpen, setAddItemModalOpen] = useState(false);
    const [editCogsModalOpen, setEditCogsModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Form states
    const [addItemForm, setAddItemForm] = useState<AddItemForm>({ itemId: '', cogsPerUom: '', link: '' });
    const [editingVendorItem, setEditingVendorItem] = useState<VendorItem | null>(null);
    const [editCogs, setEditCogs] = useState('');
    const [editLink, setEditLink] = useState('');
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const [viewedImage, setViewedImage] = useState<{ url: string; alt: string } | null>(null);

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

    // Fetch history data
    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const [purchaseRes, priceRes] = await Promise.all([
                getVendorPurchaseHistory(vendorId),
                getVendorPriceHistory(vendorId)
            ]);

            if (purchaseRes.success) {
                setPurchaseHistory(purchaseRes.data as PurchaseHistoryItem[]);
            }
            if (priceRes.success) {
                setPriceHistory(priceRes.data as PriceHistoryItem[]);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setHistoryLoading(false);
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
        fetchHistory();
    }, [fetchVendor, fetchVendorItems, fetchAllItems, fetchHistory]);

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
                    link: addItemForm.link,
                }),
            });
            setAddItemModalOpen(false);
            setAddItemForm({ itemId: '', cogsPerUom: '', link: '' });
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
                body: JSON.stringify({
                    cogsPerUom: cogsValue,
                    link: editLink
                }),
            });
            setEditCogsModalOpen(false);
            setEditingVendorItem(null);
            setEditCogs('');
            setEditLink('');
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
        setEditLink(vendorItem.link || '');
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

    // Prepare Price History Data
    const uniquePriceItems = Array.from(new Set(priceHistory.map(h => h.itemId)))
        .map(id => {
            const historyItem = priceHistory.find(h => h.itemId === id);
            return {
                value: id,
                label: `${historyItem?.sku} - ${historyItem?.itemName}`
            };
        });

    const filteredPriceHistory = selectedPriceItemId
        ? priceHistory.filter(h => h.itemId === selectedPriceItemId)
        : [];

    const chartData = filteredPriceHistory.map(h => ({
        label: new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        value: h.price,
        tooltip: `Rp ${h.price.toLocaleString('id-ID')}`
    }));

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
                                <div className="p-3 bg-indigo-500 rounded-lg shadow-md">
                                    <Building2 size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Vendor Code</div>
                                    <div className="text-lg font-bold font-mono">{vendor.code}</div>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500 bg-opacity-10 rounded-lg shadow-md">
                                    <Phone size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Phone Number</div>
                                    <div className="text-sm font-medium">{vendor.phone || "-"}</div>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-500 bg-opacity-10 rounded-lg shadow-md">
                                    <Mail size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Email Address</div>
                                    <div className="text-sm font-medium break-all">{vendor.email || "-"}</div>
                                </div>
                            </div>

                            {/* Link */}
                            {vendor.link && (
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg shadow-md">
                                        <Globe size={20} className="text-white-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-(--color-text-muted) mb-1">Website / Link</div>
                                        <a
                                            href={vendor.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-(--color-primary) hover:underline break-all"
                                        >
                                            {vendor.link}
                                        </a>
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

                                <p className="text-sm text-(--color-text-muted) leading-relaxed">{vendor.address || "-"}</p>

                            </div>
                        </div>

                        {/* Banking Information */}

                        <div className="px-6 pb-6">
                            <div className="border-t border-(--color-border) pt-6">
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <CreditCard size={16} />
                                    Banking Information
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-(--color-text-muted) mb-1">Bank Name</div>
                                        <div className="text-sm font-medium">{vendor.bank || "-"}</div>
                                    </div>
                                    {vendor.bankBranch && (
                                        <div>
                                            <div className="text-xs text-(--color-text-muted) mb-1">Branch</div>
                                            <div className="text-sm font-medium">{vendor.bankBranch || "-"}</div>
                                        </div>
                                    )}
                                    {vendor.bankAccount && (
                                        <div>
                                            <div className="text-xs text-(--color-text-muted) mb-1">Account Number</div>
                                            <div className="text-sm font-mono font-medium">{vendor.bankAccount || "-"}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

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
                                                                <TableHead>No</TableHead>
                                                                <TableHead>SKU</TableHead>
                                                                <TableHead>Image</TableHead>
                                                                <TableHead>Item Name</TableHead>
                                                                <TableHead>Category</TableHead>
                                                                <TableHead>UOM</TableHead>
                                                                <TableHead>COGS per UOM</TableHead>
                                                                <TableHead>Link</TableHead>
                                                                <TableHead>Added Date</TableHead>
                                                                <TableHead>Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {vendorItems.map((vendorItem, index) => (
                                                                <TableRow key={vendorItem.id}>
                                                                    <TableCell>
                                                                        {index + 1}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {vendorItem.item.imagePath ? (
                                                                            <img
                                                                                src={vendorItem.item.imagePath}
                                                                                alt={vendorItem.item.name}
                                                                                className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                                                                onClick={() => setViewedImage({
                                                                                    url: vendorItem.item.imagePath!,
                                                                                    alt: vendorItem.item.name
                                                                                })}
                                                                            />
                                                                        ) : (
                                                                            <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center">
                                                                                <ImageIcon size={16} className="text-gray-300" />
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
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
                                                                    <TableCell>
                                                                        {vendorItem.link ? (
                                                                            <a
                                                                                href={vendorItem.link}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-(--color-primary) hover:underline flex items-center gap-1"
                                                                            >
                                                                                Link <Edit size={12} />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-(--color-text-muted) text-sm">-</span>
                                                                        )}
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
                                        <div className="space-y-4">
                                            {historyLoading ? (
                                                <div className="text-center py-12 text-(--color-text-muted)">Loading history...</div>
                                            ) : purchaseHistory.length === 0 ? (
                                                <div className="text-center py-12 text-(--color-text-muted)">
                                                    <DollarSign size={48} className="mx-auto mb-4 opacity-40" />
                                                    <h3 className="text-lg font-medium mb-2">No Purchase History</h3>
                                                    <p className="text-sm">No completed purchases found for this vendor.</p>
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>No</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>PR Number</TableHead>
                                                            <TableHead>PO Number</TableHead>
                                                            <TableHead>GRN Number</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Total Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {purchaseHistory.map((pr, index) => (
                                                            <TableRow key={pr.id}>
                                                                <TableCell>
                                                                    {index + 1}
                                                                </TableCell>
                                                                <TableCell>{formatDate(pr.requestDate)}</TableCell>
                                                                <TableCell className="font-mono text-sm">{pr.prNumber}</TableCell>
                                                                <TableCell className="font-mono text-sm">{pr.poNumber || '-'}</TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {pr.inbounds.length > 0 ? pr.inbounds.map(i => i.grnNumber).join(', ') : '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="info" className="text-xs">
                                                                        {pr.status.replace(/_/g, ' ')}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    Rp {pr.totalAmount.toLocaleString('id-ID')}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'prices' && (
                                        <div className="space-y-6">
                                            {/* Item Selector */}
                                            <div className="max-w-md">
                                                <label className="text-sm font-medium mb-2 block">Select Item to View History</label>
                                                <Dropdown
                                                    options={uniquePriceItems}
                                                    value={selectedPriceItemId}
                                                    onChange={setSelectedPriceItemId}
                                                    placeholder="Choose an item..."
                                                />
                                            </div>

                                            {selectedPriceItemId && (
                                                <div className="bg-(--color-bg-tertiary) p-6 rounded-lg border border-(--color-border)">
                                                    <h4 className="text-sm font-semibold mb-4 text-(--color-text-muted) uppercase tracking-wider">Price Trend</h4>
                                                    <SimpleLineChart data={chartData} />
                                                </div>
                                            )}

                                            <div className="pt-4">
                                                <h4 className="text-sm font-semibold mb-4">Detailed Price Records</h4>
                                                {priceHistory.length === 0 ? (
                                                    <div className="text-center py-8 text-(--color-text-muted)">No price records found.</div>
                                                ) : (
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>No</TableHead>
                                                                <TableHead>Date</TableHead>
                                                                <TableHead>Item / SKU</TableHead>
                                                                <TableHead>UOM</TableHead>
                                                                <TableHead>Price</TableHead>
                                                                <TableHead>Source</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {(selectedPriceItemId ? filteredPriceHistory : priceHistory).map((history, index) => (
                                                                <TableRow key={`${history.id}-${history.date}`}>
                                                                    <TableCell>
                                                                        {index + 1}
                                                                    </TableCell>
                                                                    <TableCell>{formatDate(history.date)}</TableCell>
                                                                    <TableCell>
                                                                        <div className="font-medium">{history.itemName}</div>
                                                                        <div className="text-xs text-(--color-text-muted) font-mono">{history.sku}</div>
                                                                    </TableCell>
                                                                    <TableCell>{history.uom}</TableCell>
                                                                    <TableCell className="font-semibold text-(--color-primary)">
                                                                        Rp {history.price.toLocaleString('id-ID')}
                                                                    </TableCell>
                                                                    <TableCell className="text-sm text-(--color-text-muted)">
                                                                        {history.poNumber ? (
                                                                            <span title={`PO: ${history.poNumber}`}>PO: {history.poNumber}</span>
                                                                        ) : (
                                                                            <span title={`PR: ${history.prNumber}`}>PR: {history.prNumber}</span>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                )}
                                            </div>
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
                    setAddItemForm({ itemId: '', cogsPerUom: '', link: '' });
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

                    <div>
                        <label className="text-sm font-medium mb-1 block">Item Link / Website (Optional)</label>
                        <Input
                            placeholder="e.g. https://shopee.co.id/..."
                            value={addItemForm.link}
                            onChange={(e) => setAddItemForm({ ...addItemForm, link: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setAddItemModalOpen(false);
                                setAddItemForm({ itemId: '', cogsPerUom: '', link: '' });
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
                    setEditLink('');
                }}
                title="Edit Item Details"
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

                        <div>
                            <label className="text-sm font-medium mb-1 block">Item Link / Website</label>
                            <Input
                                placeholder="e.g. https://shopee.co.id/..."
                                value={editLink}
                                onChange={(e) => setEditLink(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setEditCogsModalOpen(false);
                                    setEditingVendorItem(null);
                                    setEditCogs('');
                                    setEditLink('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateCogs}>
                                Save Changes
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

// Image Overlay Component
function ImageOverlay({
    src,
    alt,
    onClose
}: {
    src: string;
    alt: string;
    onClose: () => void
}) {
    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 animate-fadeIn"
            onClick={onClose}
        >
            <div className="relative max-w-4xl max-h-[90vh] w-full p-4 flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
                >
                    <Plus className="rotate-45" size={32} />
                </button>

                <img
                    src={src}
                    alt={alt}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                <div className="mt-4 text-white text-lg font-medium text-center bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    {alt}
                </div>
            </div>
        </div>
    );
}

function SimpleLineChart({ data, height = 200 }: { data: { label: string; value: number; tooltip: string }[]; height?: number }) {
    if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">No data available</div>;

    const padding = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = 800; // SVG viewBox width
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value)) * 1.1; // 10% headroom
    const minValue = 0; // Always start from 0 for price context

    const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

    const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px]">
                {/* Y Axis */}
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e5e7eb" strokeWidth="1" />
                {/* X Axis */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e5e7eb" strokeWidth="1" />

                {/* Y Axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const value = minValue + (maxValue - minValue) * ratio;
                    const y = height - padding.bottom - (ratio * chartHeight);
                    return (
                        <g key={ratio}>
                            <line x1={padding.left - 5} y1={y} x2={padding.left} y2={y} stroke="#e5e7eb" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                                {value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {/* X Axis Labels */}
                {data.map((d, i) => (
                    <text key={i} x={getX(i)} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" fill="#6b7280">
                        {d.label}
                    </text>
                ))}

                {/* Line Path */}
                <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} className="text-(--color-primary)" />

                {/* Data Points */}
                {data.map((d, i) => (
                    <g key={i} className="group">
                        <circle cx={getX(i)} cy={getY(d.value)} r="4" fill="currentColor" className="text-(--color-primary)" />
                        {/* Tooltip */}
                        <g className="invisible group-hover:visible transition-opacity">
                            <rect x={getX(i) - 40} y={getY(d.value) - 35} width="80" height="25" rx="4" fill="black" fillOpacity="0.8" />
                            <text x={getX(i)} y={getY(d.value) - 19} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                                {d.value.toLocaleString('id-ID')}
                            </text>
                        </g>
                    </g>
                ))}
            </svg>
        </div>
    );
}
