'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust import if needed
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Loader2, Upload, FileText, X, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Adjust import if needed
import { format } from 'date-fns';

interface PaymentRealizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PaymentRealizationData) => Promise<void>;
    purchaseRequest: {
        id: string;
        prNumber: string;
        totalAmount: number;
        vendor: { name: string };
    };
}

export interface PaymentRealizationData {
    amount: number;
    paymentDate: Date;
    notes: string;
    proofUrl: string | null;
}

export default function PaymentRealizationModal({
    isOpen,
    onClose,
    onSubmit,
    purchaseRequest
}: PaymentRealizationModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [amount, setAmount] = useState(purchaseRequest.totalAmount); // Default to full amount
    const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only Images and PDF are allowed');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('File size exceeds 5MB limit');
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async () => {
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!paymentDate) {
            alert('Please select payment date');
            return;
        }

        setIsSubmitting(true);
        try {
            let proofUrl = null;

            if (selectedFile) {
                // Upload logic
                const { data: { session } } = await supabase.auth.getSession();
                const headers: HeadersInit = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('prNumber', purchaseRequest.prNumber);

                const response = await fetch('/api/upload/payment-proof', { // Need to ensure this API exists or reuse po-document one
                    method: 'POST',
                    headers,
                    body: formData
                });

                // Assuming reuse of general upload or creating specific endpoint. 
                // If endpoint doesn't exist, I might need to create it.
                // For now, assume a generic upload endpoint or reuse existing.
                // I will use `po-document` endpoint for now or check if generic exists. 
                // Actually, I should probably create a `payment-proof` endpoint or checking existing.
                // Let's assume '/api/upload/payment-proof' and I'll create it next if needed.
                // Or safely, use '/api/upload/po-document' and rename? No.
                // I'll stick to '/api/upload/payment-proof' plan.

                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'Upload failed');
                proofUrl = result.path;
            }

            await onSubmit({
                amount,
                paymentDate: new Date(paymentDate),
                notes,
                proofUrl
            });

            onClose();

        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Payment Realization - ${purchaseRequest.prNumber}`}>
            <div className="space-y-6">

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        <DollarSign size={16} className="inline mr-2" />
                        Payment Amount (IDR)
                    </label>
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="bg-(--color-bg-secondary)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Total Bill: {formatCurrency(purchaseRequest.totalAmount)}
                    </p>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        <Calendar size={16} className="inline mr-2" />
                        Payment Date
                    </label>
                    <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="bg-(--color-bg-secondary)"
                        max={format(new Date(), 'yyyy-MM-dd')}
                    />
                </div>

                {/* Proof Upload */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        Transfer Proof (Optional but Recommended)
                    </label>
                    <div className="Border border-(--color-border) border-dashed rounded-lg p-6 text-center">
                        {selectedFile ? (
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-green-600" size={20} />
                                    <span className="text-sm font-medium text-green-900 dark:text-green-100">{selectedFile.name}</span>
                                </div>
                                <button onClick={() => setSelectedFile(null)} className="text-red-600 hover:text-red-700">
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer">
                                <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                                <div className="flex flex-col items-center">
                                    <Upload className="text-(--color-text-muted) mb-2" size={32} />
                                    <p className="text-sm text-(--color-text-primary)">Click to select proof</p>
                                </div>
                            </label>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">Notes</label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="bg-(--color-bg-secondary)"
                        placeholder="Bank details, reference number, etc."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-(--color-border)">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm Payment'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
