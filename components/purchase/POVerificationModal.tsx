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
                code: string;
                name: string;
            };
            quantity: number;
            unitPrice: number;
        }>;
    };
}

export interface POVerificationData {
    poDocumentPath?: string;
    shippingTrackingNumber?: string;
    estimatedShippingDate?: Date;
    purchasingNotes?: string;
}

export default function POVerificationModal({
    isOpen,
    onClose,
    onVerify,
    purchaseRequest
}: POVerificationModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Removed isUploading, as it will be part of submitting process

    // Form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');
    const [estimatedShippingDate, setEstimatedShippingDate] = useState('');
    const [purchasingNotes, setPurchasingNotes] = useState('');

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
        if (!estimatedShippingDate) {
            alert('Please select estimated shipping date');
            return;
        }

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
            await onVerify({
                poDocumentPath,
                shippingTrackingNumber: shippingTrackingNumber || undefined,
                estimatedShippingDate: new Date(estimatedShippingDate),
                purchasingNotes
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
        <Modal isOpen={isOpen} onClose={onClose} title="Verify Purchase Order & Create Inbound">
            <div className="space-y-6">
                {/* PR Summary */}
                <div className="p-4 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg">
                    <h4 className="font-medium text-(--color-text-primary) mb-3">Purchase Request Summary</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-(--color-text-secondary)">PR Number:</span>
                            <span className="font-medium text-(--color-text-primary)">{purchaseRequest.prNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-(--color-text-secondary)">Vendor:</span>
                            <span className="font-medium text-(--color-text-primary)">{purchaseRequest.vendor.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-(--color-text-secondary)">Total Items:</span>
                            <span className="font-medium text-(--color-text-primary)">{purchaseRequest.items.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-(--color-text-secondary)">Total Amount:</span>
                            <span className="font-semibold text-primary">{formatCurrency(purchaseRequest.totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* PO Document Upload */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        PO Document *(Optional but Recommended)*
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

                {/* Estimated Shipping Date */}
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
                        • PO Number will be generated automatically
                        <br />
                        • Inbound (GRN) entry will be created
                        <br />
                        • Warehouse staff can track incoming goods

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
                        {isSubmitting ? 'Verifying...' : 'Verify & Create PO'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
