'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Search,
    Plus,
    Trash2,
    Save,
    Send,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createPurchaseRequest, updatePurchaseRequest } from '@/app/actions/purchase';

interface PRItem {
    id: string; // Temporary ID for new items
    itemId: string;
    code: string;
    name: string;
    spec: string; // Additional spec if needed
    uom: string;
    qty: number;
    unitPrice: number;
    totalAmount: number;
    notes?: string;
    fromRabLineId?: string; // Link to RAB line if applicable
}

interface ClientPRFormProps {
    vendors: any[];
    rabs: any[];
    initialData?: any;
}

export default function ClientPRForm({ vendors, rabs, initialData }: ClientPRFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!initialData;

    // Form State
    const [prDate, setPrDate] = useState(initialData ? format(new Date(initialData.requestDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState(initialData?.notes || '');
    const [selectedVendorId, setSelectedVendorId] = useState(initialData?.vendorId || '');
    const [selectedRabId, setSelectedRabId] = useState(initialData?.rabId || '');
    const [items, setItems] = useState<PRItem[]>(
        initialData?.items?.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            itemId: item.itemId,
            code: item.item?.code || 'UNKNOWN',
            name: item.item?.name || 'Unknown Item',
            spec: '',
            uom: 'UOM', // Fallback or need to fetch item details in initialData
            qty: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalAmount: Number(item.totalPrice),
            notes: item.notes,
            fromRabLineId: undefined
        })) || []
    );

    // Derived State
    const selectedVendor = vendors.find(v => v.id === selectedVendorId);

    // Strict Vendor Logic: Clear items if Vendor changes
    const handleVendorChange = (vendorId: string) => {
        if (items.length > 0 && vendorId !== selectedVendorId) {
            if (confirm('Changing vendor will clear current items. Continue?')) {
                setItems([]);
                setSelectedRabId(''); // Reset RAB too as it might not match
                setSelectedVendorId(vendorId);
            }
        } else {
            setSelectedVendorId(vendorId);
        }
    };

    // Load Items from RAB
    const handleRabChange = (rabId: string) => {
        if (!selectedVendorId) {
            alert('Please select a Vendor first.');
            return;
        }

        setSelectedRabId(rabId);

        if (!rabId) return;

        const rab = rabs.find(r => r.id === rabId);
        if (rab) {
            const relevantLines = rab.rabLines.filter((line: any) => {
                const vendorSuppliesItem = selectedVendor?.suppliedItems?.some((vi: any) => vi.itemId === line.itemId);
                return vendorSuppliesItem && line.replenishQty > 0;
            });

            if (relevantLines.length === 0) {
                alert('No items in this RAB are supplied by the selected Vendor (or all have 0 replenish qty).');
                return;
            }

            const newItems: PRItem[] = relevantLines.map((line: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                itemId: line.itemId,
                code: line.item.code,
                name: line.item.name,
                spec: '',
                uom: line.item.uom,
                qty: line.replenishQty,
                unitPrice: Number(line.unitPrice),
                totalAmount: Number(line.replenishQty) * Number(line.unitPrice),
                fromRabLineId: line.id
            }));

            if (items.length > 0) {
                if (confirm('Replace existing items with RAB items?')) {
                    setItems(newItems);
                }
            } else {
                setItems(newItems);
            }
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.totalAmount, 0);
    };

    const handleSubmit = async (status: 'DRAFT' | 'PENDING_MANAGER_APPROVAL') => {
        if (!user?.id) {
            if (process.env.NODE_ENV !== 'development' || !user) {
                alert('User not authenticated');
                return;
            }
        }

        if (!selectedVendorId) {
            alert('Vendor is required');
            return;
        }
        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                userId: user?.id || 'mock-user-id',
                requestDate: new Date(prDate),
                description,
                vendorId: selectedVendorId,
                rabId: selectedRabId || undefined,
                status,
                items: items.map(item => ({
                    itemId: item.itemId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    notes: item.notes,
                    fromRabLineId: item.fromRabLineId
                }))
            };

            let result;
            if (isEditMode) {
                // For edit, existing ID is used. 'updatePurchaseRequest' expects UpdatePRInput which has ID.
                const updatePayload = { ...payload, id: initialData.id };
                result = await updatePurchaseRequest(updatePayload);
            } else {
                result = await createPurchaseRequest(payload);
            }

            if (result.success) {
                const action = isEditMode ? "Updated" : "Created";
                alert(`PR ${action} Successfully! Number: ${result.data?.prNumber}`);
                router.push('/purchase');
                router.refresh();
            } else {
                alert(`Failed to ${isEditMode ? 'update' : 'create'} PR: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        {isEditMode ? 'Edit Purchase Request' : 'Create Purchase Request'}
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        {isEditMode ? 'Modify existing request' : 'New request for material purchase'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => router.back()}
                        className="border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-bg-hover)"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleSubmit('DRAFT')}
                        disabled={isSubmitting}
                        className="border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary)/10"
                    >
                        <Save size={18} className="mr-2" />
                        Save Draft
                    </Button>
                    <Button
                        onClick={() => handleSubmit('PENDING_MANAGER_APPROVAL')}
                        disabled={isSubmitting}
                        className="bg-(--color-primary) hover:bg-(--color-primary)/90 text-white shadow-lg shadow-(--color-primary)/20"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                        {isEditMode && initialData.status === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Info */}
                <Card className="bg-(--color-bg-card) border-(--color-border) shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-(--color-text-primary)">
                            General Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                Request Date
                            </label>
                            <Input
                                type="date"
                                value={prDate}
                                onChange={(e) => setPrDate(e.target.value)}
                                className="bg-(--color-bg-secondary) border-(--color-border) text-(--color-text-primary)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                Description / Notes
                            </label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter purpose of request..."
                                className="bg-(--color-bg-secondary) border-(--color-border) text-(--color-text-primary)"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Source & Vendor */}
                <Card className="bg-(--color-bg-card) border-(--color-border) shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-(--color-text-primary)">
                            Source & Vendor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                Vendor <span className="text-red-500">*</span>
                            </label>
                            <SearchableDropdown
                                options={vendors.map(v => ({ value: v.id, label: v.name }))}
                                value={selectedVendorId}
                                onChange={(val) => handleVendorChange(val as string)}
                                placeholder="Select Vendor"
                                className="w-full"
                            />
                            {selectedVendorId && (
                                <p className="text-xs text-(--color-text-muted) mt-1">
                                    Only items supplied by this vendor will be available.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                Source RAB (Optional)
                            </label>
                            <SearchableDropdown
                                options={rabs.map(r => ({ value: r.id, label: `${r.code} - ${r.name}` }))}
                                value={selectedRabId}
                                onChange={(val) => handleRabChange(val as string)}
                                placeholder="Select Approved RAB..."
                                disabled={!selectedVendorId}
                                className="w-full"
                            />
                            {!selectedVendorId && (
                                <p className="text-xs text-amber-500 mt-1">
                                    Select a vendor first to filter RAB items.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Items Table */}
            <Card className="bg-(--color-bg-card) border-(--color-border) shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-medium text-(--color-text-primary)">
                        Request Items
                    </CardTitle>
                    <Button
                        disabled={!selectedVendorId}
                        variant="secondary"
                        className="border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary)/10"
                        onClick={() => alert('Manual Item Add Modal to be implemented')}
                    >
                        <Plus size={16} className="mr-2" />
                        Add Item Manually
                    </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-(--color-bg-secondary) text-(--color-text-secondary) uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-3">Item Code</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-center">UOM</th>
                                <th className="px-4 py-3 text-right">Est. Price</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-(--color-text-muted)">
                                        No items added. Select a RAB or add manually.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-(--color-bg-hover)/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-(--color-text-primary)">
                                            {item.code}
                                        </td>
                                        <td className="px-4 py-3 text-(--color-text-secondary)">
                                            {item.name}
                                            {item.spec && <div className="text-xs text-(--color-text-muted)">{item.spec}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.fromRabLineId ? (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    RAB
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    Manual
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Input
                                                type="number"
                                                value={item.qty}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    const newItems = [...items];
                                                    newItems[index].qty = val;
                                                    newItems[index].totalAmount = val * newItems[index].unitPrice;
                                                    setItems(newItems);
                                                }}
                                                className="w-20 text-right h-8 bg-(--color-bg-secondary)"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center text-(--color-text-secondary)">{item.uom}</td>
                                        <td className="px-4 py-3 text-right text-(--color-text-secondary)">
                                            {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-(--color-text-primary)">
                                            {formatCurrency(item.totalAmount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => {
                                                    const newItems = items.filter((_, i) => i !== index);
                                                    setItems(newItems);
                                                }}
                                                className="text-(--color-danger) hover:text-red-700 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {items.length > 0 && (
                            <tfoot className="bg-(--color-bg-secondary) font-semibold text-(--color-text-primary)">
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right">Grand Total:</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(calculateTotal())}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>
        </div>
    );
}
