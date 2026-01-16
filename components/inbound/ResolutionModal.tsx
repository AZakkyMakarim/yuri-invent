'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Loader2, Check } from 'lucide-react';
import { InboundDiscrepancyType, DiscrepancyResolution } from '@/app/generated/prisma/client';

interface ResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onResolve: (action: DiscrepancyResolution, notes: string) => Promise<void>;
    issue: {
        id: string;
        discrepancyType: InboundDiscrepancyType;
        item: {
            sku: string;
            name: string;
        };
        expectedQuantity: number;
        receivedQuantity: number;
        rejectedQuantity: number;
    };
}

export function ResolutionModal({ isOpen, onClose, onResolve, issue }: ResolutionModalProps) {
    const [action, setAction] = useState<DiscrepancyResolution | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!action) return;
        setIsSubmitting(true);
        try {
            await onResolve(action, notes);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getOptions = () => {
        switch (issue.discrepancyType) {
            case 'SHORTAGE':
                return [
                    { value: 'WAIT_REMAINING', label: 'Wait for Remainder', desc: 'Keep track until vendor sends the rest.' },
                    { value: 'CLOSE_SHORT', label: 'Close Short', desc: 'Accept the shortage and close this line.' },
                ];
            case 'OVERAGE':
                return [
                    { value: 'RETURN_TO_VENDOR', label: 'Return Excess', desc: 'Send extra items back to vendor.' },
                    { value: 'KEEP_EXCESS', label: 'Keep Excess', desc: 'Accept extra items into stock.' },
                ];
            case 'WRONG_ITEM':
            case 'DAMAGED':
                return [
                    { value: 'RETURN_TO_VENDOR', label: 'Return Items', desc: 'Send rejected items back.' },
                    { value: 'REPLACE_ITEM', label: 'Request Replacement', desc: 'Wait for vendor to replace items.' },
                    { value: 'REFUND', label: 'Request Refund', desc: 'Ask vendor for a refund.' },
                ];
            default:
                return [];
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Resolve: ${issue.discrepancyType.replace(/_/g, ' ')}`}
            size="lg"
        >
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg text-sm border border-gray-100 dark:border-gray-800">
                    <div className="font-semibold text-base mb-1">{issue.item.name}</div>
                    <div className="text-gray-500 mb-2">{issue.item.sku}</div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <span className="block text-gray-500 text-xs">Expected</span>
                            <span className="font-mono font-medium">{issue.expectedQuantity}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Received</span>
                            <span className="font-mono font-medium">{issue.receivedQuantity}</span>
                        </div>
                        {issue.rejectedQuantity > 0 && (
                            <div>
                                <span className="block text-red-500 text-xs">Rejected</span>
                                <span className="font-mono font-medium text-red-600">{issue.rejectedQuantity}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-3">Resolution Action</label>
                    <div className="grid gap-3">
                        {getOptions().map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => setAction(opt.value as DiscrepancyResolution)}
                                className={`cursor-pointer p-3 rounded-lg border flex items-center justify-between transition-colors
                                    ${action === opt.value
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div>
                                    <div className={`font-medium ${action === opt.value ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                                        {opt.label}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                                </div>
                                {action === opt.value && <Check size={18} className="text-blue-600" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add details about this resolution..."
                        rows={3}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!action || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                        Confirm Resolution
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
