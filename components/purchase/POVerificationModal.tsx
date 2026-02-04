'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Upload, X, FileText, Loader2, Calendar, Package } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { formatCurrency } from '@/lib/utils';

interface POVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (data: POVerificationData) => Promise<void>;
    purchaseRequest: {
        id: string;
        prNumber: string;
        vendor: {
            name: string;
        };
        totalAmount: number;
        items: Array<{
            item: {
                id: string;
                sku: string;
                name: string;
            };
            quantity: number;
            unitPrice: number;
            notes?: string | null;
            verifiedUnitPrice?: number | null;
        }>;
    };
    vendorType?: string;
}

export interface POVerificationData {
    poDocumentPath?: string;
    shippingTrackingNumber?: string;
    estimatedShippingDate?: Date;
    purchasingNotes?: string;
    verifiedItems: Array<{
        itemId: string;
        realPrice: number;
        notes: string;
    }>;
}

interface EditableItem {
    itemId: string;
    itemCode: string;
    itemName: string;
    qty: number;
    originalPrice: number;
    realPrice: number;
    notes: string;
}

export default function POVerificationModal({
    isOpen,
    onClose,
    onVerify,
    purchaseRequest,
    vendorType,
    isFinalizing = false
}: POVerificationModalProps & { isFinalizing?: boolean }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');
    const [estimatedShippingDate, setEstimatedShippingDate] = useState('');
    const [purchasingNotes, setPurchasingNotes] = useState('');

    // Items state
    const [items, setItems] = useState<EditableItem[]>(() =>
        purchaseRequest.items.map(i => ({
            itemId: i.item.id || '',
            itemCode: i.item.sku,
            itemName: i.item.name,
            qty: i.quantity,
            originalPrice: Number(i.unitPrice),
            // If finalizing, show the verified price if available, else unitPrice
            realPrice: (i as any).verifiedUnitPrice ? Number((i as any).verifiedUnitPrice) : Number(i.unitPrice),
            notes: i.notes || ''
        }))
    );

    const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.realPrice), 0);

    const handleItemChange = (index: number, field: keyof EditableItem, value: any) => {
        if (isFinalizing && field === 'realPrice') return;
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validation
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only PDF, JPG, and PNG are allowed');
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('File size exceeds 10MB limit');
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async () => {
        // Validation
        if (isFinalizing && !estimatedShippingDate) {
            alert('Please select estimated shipping date for finalization');
            return;
        }

        // Optional file upload for Step 1, unless defined otherwise.

        setIsSubmitting(true);

        try {
            let poDocumentPath = undefined;

            // Upload the file if selected
            if (selectedFile) {
                // Get auth session for verified upload
                const { data: { session } } = await supabase.auth.getSession();
                const headers: HeadersInit = {};

                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('poNumber', purchaseRequest.prNumber);

                const response = await fetch('/api/upload/po-document', {
                    method: 'POST',
                    headers,
                    body: formData
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to upload file');
                }

                poDocumentPath = result.path;
            }

            // Proceed with PO Verification
            // Proceed with PO Verification
            await onVerify({
                poDocumentPath,
                shippingTrackingNumber: shippingTrackingNumber || undefined,
                estimatedShippingDate: estimatedShippingDate ? new Date(estimatedShippingDate) : undefined,
                purchasingNotes,
                verifiedItems: items.map(i => ({
                    itemId: i.itemId,
                    realPrice: i.realPrice,
                    notes: i.notes
                }))
            });

            // Reset form
            setSelectedFile(null);
            setShippingTrackingNumber('');
            setEstimatedShippingDate('');
            setPurchasingNotes('');

            onClose();
        } catch (error: any) {
            console.error('Verification error:', error);
            alert(error.message || 'Failed to verify PO');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isFinalizing ? "Finalize Purchase Order & Create Inbound" : "Verify Prices & Items"}
        >
            <div className="space-y-6">
                {/* Vendor Type Badge */}
                {vendorType && (
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vendorType === 'SPK'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                        Vendor Type: {vendorType}
                    </div>
                )}


                {/* Items Table (Editable) */}
                <div className="border border-(--color-border) rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-(--color-bg-secondary) text-(--color-text-secondary) font-medium border-b border-(--color-border)">
                            <tr>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Est. Price</th>
                                <th className="px-4 py-3 text-right w-40">Real Price *</th>
                                <th className="px-4 py-3 w-48">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)">
                            {items.map((item, index) => (
                                <tr key={index} className="bg-(--color-bg-card)">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-(--color-text-primary)">{item.itemName}</div>
                                        <div className="text-xs text-(--color-text-muted)">{item.itemCode}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">{item.qty}</td>
                                    <td className="px-4 py-3 text-right text-(--color-text-muted)">
                                        {formatCurrency(item.originalPrice)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Input
                                            type="number"
                                            value={item.realPrice}
                                            onChange={(e) => handleItemChange(index, 'realPrice', Number(e.target.value))}
                                            className={`text-right h-8 bg-(--color-bg-secondary) ${isFinalizing ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                                            min="0"
                                            disabled={isFinalizing}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input
                                            value={item.notes}
                                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                            placeholder="Item notes..."
                                            className="h-8 bg-(--color-bg-secondary)"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-(--color-bg-secondary) font-bold border-t border-(--color-border)">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right text-(--color-text-secondary)">Total Amount:</td>
                                <td colSpan={2} className="px-4 py-3 text-primary text-lg">
                                    {formatCurrency(totalAmount)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* PO Document Upload */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        {isFinalizing ? "Signed PO / Final Document (Optional)" : "Quote / Price Proof (Optional)"}
                    </label>
                    <div className="Border border-(--color-border) border-dashed rounded-lg p-6 text-center">
                        {selectedFile ? (
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-green-600" size={20} />
                                    <span className="text-sm font-medium text-green-900 dark:text-green-100">{selectedFile.name}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <div className="flex flex-col items-center">
                                    <Upload className="text-(--color-text-muted) mb-2" size={32} />
                                    <p className="text-sm text-(--color-text-primary) mb-1">
                                        Click to select PO document
                                    </p>
                                    <p className="text-xs text-(--color-text-muted)">
                                        PDF, JPG, or PNG (max 10MB)
                                    </p>
                                </div>
                            </label>
                        )}
                    </div>
                </div>

                {/* Shipping Tracking Number */}
                {isFinalizing && (
                    <div>
                        <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                            <Package size={16} className="inline mr-2" />
                            Shipping Tracking Number (Optional)
                        </label>
                        <Input
                            type="text"
                            value={shippingTrackingNumber}
                            onChange={(e) => setShippingTrackingNumber(e.target.value)}
                            placeholder="e.g., JNE123456789"
                            className="bg-(--color-bg-secondary) border-(--color-border)"
                        />
                    </div>
                )}

                {/* Estimated Shipping Date */}
                {isFinalizing ? (
                    <div>
                        <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                            <Calendar size={16} className="inline mr-2" />
                            Estimated Delivery Date *
                        </label>
                        <Input
                            type="date"
                            value={estimatedShippingDate}
                            onChange={(e) => setEstimatedShippingDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className="bg-(--color-bg-secondary) border-(--color-border)"
                            required
                        />
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 italic">
                        Note: Shipping details will be collected during Finalization.
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        Notes (Optional)
                    </label>
                    <Textarea
                        value={purchasingNotes}
                        onChange={(e) => setPurchasingNotes(e.target.value)}
                        placeholder="Add any additional notes..."
                        rows={3}
                        className="bg-(--color-bg-secondary) border-(--color-border)"
                    />
                </div>

                {/* Info Message */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>ℹ️ What happens next:</strong>
                        <br />
                        {isFinalizing ? (
                            <>
                                • PO Status will change to PO ISSUED<br />
                                • Inbound (GRN) entry will be created<br />
                                • Warehouse staff can track incoming goods
                            </>
                        ) : (
                            <>
                                {vendorType === 'SPK'
                                    ? "• PO will be generated (Status: PO GENERATED)\n• You must then 'Finalize' to create Inbound"
                                    : "• Status will update to WAITING PAYMENT\n• Finance must release payment before Finalization"}
                            </>
                        )}

                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-(--color-border)">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="border-(--color-border)"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !estimatedShippingDate}
                        className="bg-(--color-primary) hover:bg-(--color-primary)/90 text-white flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                        {isSubmitting
                            ? (isFinalizing ? 'Finalizing...' : 'Verifying...')
                            : (isFinalizing ? 'Finalize & Create Inbound' : 'Verify Prices & Proceed')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
