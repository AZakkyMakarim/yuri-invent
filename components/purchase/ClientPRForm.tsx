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
    Loader2,
    AlertTriangle,
    FileText,
    Upload,
    X,
    ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createPurchaseRequest, updatePurchaseRequest } from '@/app/actions/purchase';
import { getWarehouses } from '@/app/actions/warehouses';
import ItemPickerModal from './ItemPickerModal';

import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';
import JustificationModal from './JustificationModal';
import { useTranslations } from 'next-intl';

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
    isSuppliedByVendor?: boolean; // Whether vendor has this item in their VendorItem list
    imagePath?: string | null;
    brand?: string | null;
    type?: string | null;
    movementType?: string | null;
}

interface ClientPRFormProps {
    vendors: any[];
    rabs: any[];
    initialData?: any;
}

export default function ClientPRForm({ vendors: initialVendors, rabs, initialData }: ClientPRFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('purchase.form');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!initialData;
    const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

    // Vendor State Management
    const [vendors, setVendors] = useState(initialVendors);

    // Form State
    const [prDate, setPrDate] = useState(initialData ? format(new Date(initialData.requestDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState(initialData?.notes || '');
    const [selectedVendorId, setSelectedVendorId] = useState(initialData?.vendorId || '');
    const [selectedRabId, setSelectedRabId] = useState(initialData?.rabId || '');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(initialData?.targetWarehouseId || '');
    const [warehouses, setWarehouses] = useState<any[]>([]); // Add warehouses state
    const [items, setItems] = useState<PRItem[]>(
        initialData?.items?.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            itemId: item.itemId,
            code: item.item?.sku || item.item?.code || 'UNKNOWN',
            name: item.item?.name || 'Unknown Item',
            spec: '',
            uom: 'UOM', // Fallback or need to fetch item details in initialData
            qty: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalAmount: Number(item.totalPrice),
            notes: item.notes,
            fromRabLineId: undefined,
            imagePath: item.item?.imagePath || null,
            brand: item.item?.brand,
            type: item.item?.type,
            movementType: item.item?.movementType
        })) || []
    );

    // Justification State
    const [requiresJustification, setRequiresJustification] = useState(false);
    const [justificationReason, setJustificationReason] = useState(initialData?.justificationReason || '');
    const [justificationDocument, setJustificationDocument] = useState(initialData?.justificationDocument || '');
    const [showJustificationModal, setShowJustificationModal] = useState(false);
    const [itemsExceedingBudget, setItemsExceedingBudget] = useState<any[]>([]);

    useEffect(() => {
        getWarehouses().then(res => {
            if (res.success) setWarehouses(res.data as any[]);
        });
    }, []);

    // Derived State
    // Derived State
    const selectedVendor = vendors.find(v => v.id === selectedVendorId);

    // Strict Vendor Logic: Clear items if Vendor changes
    const handleVendorChange = (vendorId: string) => {
        if (items.length > 0 && vendorId !== selectedVendorId) {
            if (confirm(t('warnings.changeVendor'))) {
                setItems([]);
                setSelectedRabId(''); // Reset RAB too as it might not match
                setSelectedVendorId(vendorId);
            }
        } else {
            setSelectedVendorId(vendorId);
        }
    };

    // Handle RAB Selection - just select the RAB, don't auto-load items
    const handleRabChange = (rabId: string) => {
        if (!selectedVendorId) {
            alert(t('fields.rabNoVendor'));
            return;
        }

        setSelectedRabId(rabId);

        // Note: Items are no longer auto-loaded. 
        // User will add items manually using the "Add Item" button
    };

    // Handle adding item from modal
    const handleAddItemFromModal = (itemOption: any) => {
        // Check if item already exists
        const exists = items.some(item => item.itemId === itemOption.itemId);
        if (exists) {
            alert(t('warnings.itemExists'));
            return;
        }

        const newItem: PRItem = {
            id: Math.random().toString(36).substr(2, 9),
            itemId: itemOption.itemId,
            code: itemOption.code,
            name: itemOption.name,
            spec: '',
            uom: itemOption.uom,
            qty: itemOption.rabQty || 1,
            unitPrice: itemOption.unitPrice,
            totalAmount: (itemOption.rabQty || 1) * itemOption.unitPrice,
            fromRabLineId: itemOption.fromRabLineId,
            isSuppliedByVendor: itemOption.isSuppliedByVendor,
            imagePath: itemOption.imagePath,
            brand: itemOption.brand,
            type: itemOption.type,
            movementType: itemOption.movementType
        };

        setItems([...items, newItem]);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.totalAmount, 0);
    };

    // Detect if justification is required (check against RAB)
    useEffect(() => {
        if (items.length === 0) {
            setRequiresJustification(false);
            setItemsExceedingBudget([]);
            return;
        }

        // Case 1: No RAB selected - ALL items need justification
        if (!selectedRabId) {
            setRequiresJustification(true);
            setItemsExceedingBudget(
                items.map(item => ({
                    name: item.name,
                    isNotInRab: true
                }))
            );
            return;
        }

        // Case 2 & 3: RAB selected - check if items exceed or not in RAB
        // Case 2 & 3: RAB selected - check if items exceed or not in RAB
        const selectedRab = rabs.find(r => r.id === selectedRabId);
        if (!selectedRab?.rabLines) {
            // RAB has no lines, treat as no RAB
            setRequiresJustification(true);
            setItemsExceedingBudget(
                items.map(item => ({
                    name: item.name,
                    isNotInRab: true
                }))
            );
            return;
        }

        // Check if any item exceeds RAB or is not in RAB
        let needsJustification = false;
        const exceedingItems: any[] = [];

        for (const item of items) {
            const rabLine = selectedRab.rabLines.find((l: any) => l.itemId === item.itemId);

            if (!rabLine) {
                // Item not in RAB
                needsJustification = true;
                exceedingItems.push({
                    name: item.name,
                    isNotInRab: true
                });
            } else if (item.qty > rabLine.replenishQty) {
                // Quantity exceeds RAB budget
                needsJustification = true;
                exceedingItems.push({
                    name: item.name,
                    requestedQty: item.qty,
                    budgetQty: rabLine.replenishQty,
                    isNotInRab: false
                });
            }
        }

        setRequiresJustification(needsJustification);
        setItemsExceedingBudget(exceedingItems);
    }, [items, selectedRabId, rabs]);

    const handleSubmit = async (
        status: 'DRAFT' | 'PENDING_MANAGER_APPROVAL',
        justificationData?: { reason: string; document?: string }
    ) => {
        if (!user?.id) {
            if (process.env.NODE_ENV !== 'development' || !user) { // Assuming development check for mock user
                alert('User not authenticated');
                return;
            }
        }

        if (!selectedVendorId) {
            alert(t('warnings.noVendor'));
            return;
        }
        if (items.length === 0) {
            alert(t('warnings.noItems'));
            return;
        }

        // Check for items not supplied by vendor
        const unsuppliedItems = items.filter(item => item.fromRabLineId && !item.isSuppliedByVendor);

        if (unsuppliedItems.length > 0 && status === 'PENDING_MANAGER_APPROVAL') {
            const itemList = unsuppliedItems.map(item => `- ${item.name}`).join('\n');
            const confirmMsg = t('warnings.unsupplied', {
                count: unsuppliedItems.length,
                items: itemList
            });

            if (!confirm(confirmMsg)) {
                return;
            }
        }

        // Determine effective values (use passed data or state)
        const effectiveReason = justificationData?.reason || justificationReason;
        const effectiveDocument = justificationData?.document || justificationDocument;

        // Justification validation - SHOW MODAL instead of blocking directly
        if (requiresJustification && status === 'PENDING_MANAGER_APPROVAL' && !effectiveReason.trim()) {
            // Open modal to collect justification
            setShowJustificationModal(true);
            setIsSubmitting(false);
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
                targetWarehouseId: selectedWarehouseId || undefined,
                status,
                items: items.map(item => ({
                    itemId: item.itemId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    notes: item.notes,
                    fromRabLineId: item.fromRabLineId
                })),
                requiresJustification,
                // Use effective values here
                justificationReason: requiresJustification ? effectiveReason : undefined,
                justificationDocument: requiresJustification ? effectiveDocument : undefined
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
                const message = isEditMode
                    ? t('messages.successUpdated', { number: result.data?.prNumber })
                    : t('messages.successCreated', { number: result.data?.prNumber });
                alert(message);
                router.push('/purchase');
                router.refresh(); // Important to refresh server data
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
                        {isEditMode ? t('editTitle') : t('createTitle')}
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        {isEditMode ? t('editDescription') : t('createDescription')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => router.back()}
                        className="border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-bg-hover)"
                    >
                        {t('buttons.cancel')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleSubmit('DRAFT')}
                        disabled={isSubmitting}
                        className="border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary)/10"
                    >
                        <Save size={18} className="mr-2" />
                        {t('buttons.saveDraft')}
                    </Button>
                    <Button
                        onClick={() => handleSubmit('PENDING_MANAGER_APPROVAL')}
                        disabled={isSubmitting}
                        className="bg-(--color-primary) hover:bg-(--color-primary)/90 text-white shadow-lg shadow-(--color-primary)/20"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                        {isEditMode && initialData.status === 'REJECTED' ? t('buttons.resubmitApproval') : t('buttons.submitApproval')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Info */}
                <Card className="bg-(--color-bg-card) border-(--color-border) shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-(--color-text-primary)">
                            {t('sections.generalInfo')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                {t('fields.requestDate')}
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
                                {t('fields.description')}
                            </label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('fields.descriptionPlaceholder')}
                                className="bg-(--color-bg-secondary) border-(--color-border) text-(--color-text-primary)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                Destination Warehouse
                            </label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                value={selectedWarehouseId}
                                onChange={e => setSelectedWarehouseId(e.target.value)}
                            >
                                <option value="">Select Warehouse (Optional)</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.name} {w.isDefault ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-(--color-text-muted) mt-1">If empty, will default to Main Warehouse during receiving.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Source & Vendor */}
                <Card className="bg-(--color-bg-card) border-(--color-border) shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-(--color-text-primary)">
                            {t('sections.sourceVendor')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                {t('fields.vendor')} <span className="text-red-500">*</span>
                            </label>
                            <SearchableDropdown
                                options={vendors.map(v => ({ value: v.id, label: v.name }))}
                                value={selectedVendorId}
                                onChange={(val) => handleVendorChange(val as string)}
                                placeholder={t('fields.vendorPlaceholder')}
                                className="w-full"
                            />
                            {selectedVendorId && (
                                <p className="text-xs text-(--color-text-muted) mt-1">
                                    {t('fields.vendorHelp')}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                {t('fields.sourceRab')}
                            </label>
                            <SearchableDropdown
                                options={rabs.map(r => ({ value: r.id, label: `${r.code} - ${r.name}` }))}
                                value={selectedRabId}
                                onChange={(val) => handleRabChange(val as string)}
                                placeholder={t('fields.rabPlaceholder')}
                                disabled={!selectedVendorId}
                                className="w-full"
                            />
                            {selectedRabId ? (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {t('fields.rabSelected')}
                                </p>
                            ) : !selectedVendorId ? (
                                <p className="text-xs text-orange-500 mt-1">
                                    {t('fields.rabNoVendor')}
                                </p>
                            ) : (
                                <p className="text-xs text-(--color-text-muted) mt-1">
                                    {t('fields.rabHelp')}
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
                        {t('sections.requestItems')}
                    </CardTitle>
                    <Button
                        disabled={!selectedVendorId}
                        variant="secondary"
                        className="border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary)/10"
                        onClick={() => setIsItemPickerOpen(true)}
                    >
                        <Plus size={16} className="mr-2" />
                        {t('buttons.addItem')}
                    </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-(--color-bg-secondary) text-(--color-text-secondary) uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-3">{t('itemsTable.code')}</th>
                                <th className="px-4 py-3 w-16">Image</th>
                                <th className="px-4 py-3">{t('itemsTable.description')}</th>
                                <th className="px-4 py-3">{t('itemsTable.source')}</th>
                                <th className="px-4 py-3 text-right">{t('itemsTable.qty')}</th>
                                <th className="px-4 py-3 text-center">{t('itemsTable.uom')}</th>
                                <th className="px-4 py-3 text-right">{t('itemsTable.estPrice')}</th>
                                <th className="px-4 py-3 text-right">{t('itemsTable.total')}</th>
                                <th className="px-4 py-3 text-center">{t('itemsTable.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-(--color-text-muted)">
                                        {t('itemsTable.noItems')}
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-(--color-bg-hover)/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-(--color-text-primary)">
                                            {item.code}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.imagePath ? (
                                                <div className="h-10 w-10 rounded border overflow-hidden bg-white">
                                                    <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 rounded border bg-gray-50 flex items-center justify-center text-gray-300">
                                                    <ImageIcon size={16} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-(--color-text-secondary)">
                                            {item.name}
                                            {item.spec && <div className="text-xs text-(--color-text-muted)">{item.spec}</div>}
                                            <div className="text-[10px] text-(--color-text-muted) mt-0.5 flex flex-wrap gap-x-2">
                                                {item.brand && <span>B: {item.brand}</span>}
                                                {item.type && <span>T: {item.type}</span>}
                                                {item.movementType && <span>M: {item.movementType}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {/* RAB Badge */}
                                                    {item.fromRabLineId && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            {t('badges.rab')}
                                                        </span>
                                                    )}

                                                    {/* Vendor Supply Status */}
                                                    {item.isSuppliedByVendor ? (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 inline-flex items-center gap-1">
                                                            <span className="text-[10px]">✓</span> {t('badges.supplied')}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 inline-flex items-center gap-1">
                                                            <span className="text-[10px]">✕</span> {t('badges.unsupplied')}
                                                        </span>
                                                    )}
                                                </div>
                                                {!item.isSuppliedByVendor && (
                                                    <div className="text-[10px] text-orange-600 dark:text-orange-400">
                                                        {t('badges.verifyPricing')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <FormattedNumberInput
                                                value={item.qty}
                                                onChange={(val) => {
                                                    const newItems = [...items];
                                                    newItems[index].qty = val;
                                                    newItems[index].totalAmount = val * newItems[index].unitPrice;
                                                    setItems(newItems);
                                                }}
                                                decimals={0}
                                                className="w-24 text-right h-8 bg-(--color-bg-secondary)"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center text-(--color-text-secondary)">{item.uom}</td>
                                        <td className="px-4 py-3 text-right">
                                            <FormattedNumberInput
                                                value={item.unitPrice}
                                                onChange={(val) => {
                                                    const newItems = [...items];
                                                    newItems[index].unitPrice = val;
                                                    newItems[index].totalAmount = newItems[index].qty * val;
                                                    setItems(newItems);
                                                }}
                                                decimals={2}
                                                className={`w-32 text-right h-8 ${!item.isSuppliedByVendor
                                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                                    : 'bg-(--color-bg-secondary)'
                                                    }`}
                                                placeholder="0,00"
                                            />
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
                                    <td colSpan={6} className="px-4 py-3 text-right">{t('itemsTable.grandTotal')}:</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(calculateTotal())}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            {/* Item Picker Modal */}
            <ItemPickerModal
                isOpen={isItemPickerOpen}
                onClose={() => setIsItemPickerOpen(false)}
                onAddItem={handleAddItemFromModal}
                vendorId={selectedVendorId}
                vendorSuppliedItems={selectedVendor?.suppliedItems || []}
                rabId={selectedRabId}
                rab={rabs.find(r => r.id === selectedRabId)}
            />



            {/* Justification Modal */}
            <JustificationModal
                isOpen={showJustificationModal}
                onClose={() => {
                    setShowJustificationModal(false);
                    setIsSubmitting(false);
                }}
                onSubmit={(data) => {
                    setJustificationReason(data.reason);
                    setJustificationDocument(data.document || '');
                    setShowJustificationModal(false);

                    // Trigger the actual PR submission with the new data explicitly!
                    handleSubmit('PENDING_MANAGER_APPROVAL', {
                        reason: data.reason,
                        document: data.document
                    });
                }}
                itemsExceedingBudget={itemsExceedingBudget}
            />
        </div>
    );
}
