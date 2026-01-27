'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Loader2 } from 'lucide-react';

interface ConfirmPRModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { paymentType: 'SPK' | 'NON_SPK', notes?: string }) => Promise<void>;
    purchaseRequest: any;
}

export default function ConfirmPRModal({
    isOpen,
    onClose,
    onConfirm,
    purchaseRequest
}: ConfirmPRModalProps) {
    const [paymentType, setPaymentType] = useState<'SPK' | 'NON_SPK'>('SPK');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm({ paymentType, notes });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Purchase Request">
            <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-500">PR Number</span>
                        <span className="font-medium">{purchaseRequest.prNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Vendor</span>
                        <span className="font-medium">{purchaseRequest.vendor?.name}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium">Payment Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div
                            onClick={() => setPaymentType('SPK')}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${paymentType === 'SPK'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <div className="font-medium mb-1">SPK (Credit/Term)</div>
                            <div className="text-xs text-gray-500">
                                Standard flow. PO issued immediately. Payment later.
                            </div>
                        </div>
                        <div
                            onClick={() => setPaymentType('NON_SPK')}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${paymentType === 'NON_SPK'
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <div className="font-medium mb-1">Non-SPK (Cash/Advance)</div>
                            <div className="text-xs text-gray-500">
                                Requires Finance payment BEFORE PO is issued.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add confirmation notes..."
                        rows={3}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                        Confirm Request
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
