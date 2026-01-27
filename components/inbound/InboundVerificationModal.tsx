'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Loader2, Check, AlertTriangle, Upload, FileText, X } from 'lucide-react';
import { verifyInbound } from '@/app/actions/inbound';
import type { InboundVerificationItem } from '@/app/actions/inbound';
import { useAuth } from '@/contexts/AuthContext';
import type { InboundDiscrepancyType } from '@prisma/client';
import { supabase } from '@/lib/supabase'; // Using client for auth session retrieval

interface InboundVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerifySuccess: () => void;
    inbound: {
        id: string;
        grnNumber: string;
        purchaseRequest: {
            prNumber: string;
            poNumber: string | null;
        };
        vendor: {
            name: string;
        };
        items: Array<{
            itemId: string;
            item: {
                sku: string;
                name: string;
                uom: { name: string };
            };
            expectedQuantity: number;
        }>;
    };
}

export default function InboundVerificationModal({
    isOpen,
    onClose,
    onVerifySuccess,
    inbound
}: InboundVerificationModalProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verificationNotes, setVerificationNotes] = useState('');

    // File Upload State
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);

    // Items State
    const [items, setItems] = useState<InboundVerificationItem[]>([]);

    useEffect(() => {
        if (inbound) {
            setItems(inbound.items.map(i => ({
                itemId: i.itemId,
                expectedQty: i.expectedQuantity,
                receivedQty: i.expectedQuantity,
                acceptedQty: i.expectedQuantity,
                rejectedQty: 0,
                notes: '',
                discrepancyType: 'NONE',
            })));
        }
    }, [inbound]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProofFile(file);
            // Create preview if image
            if (file.type.startsWith('image/')) {
                setProofPreview(URL.createObjectURL(file));
            } else {
                setProofPreview(null);
            }
        }
    };

    const handleReceivedChange = (index: number, val: string) => {
        const qty = parseInt(val) || 0;
        const newItems = [...items];
        newItems[index].receivedQty = qty;
        // Auto-update accepted qty to match received initially
        newItems[index].acceptedQty = qty;
        newItems[index].rejectedQty = 0;
        setItems(newItems);
    };

    const handleRejectedChange = (index: number, val: string) => {
        let rejected = parseInt(val) || 0;
        const newItems = [...items];
        const received = newItems[index].receivedQty;

        if (rejected > received) rejected = received; // Cap at received

        newItems[index].rejectedQty = rejected;
        newItems[index].acceptedQty = received - rejected;

        // Auto-select Wrong Item if filtered to all items rejected? optional.
        // For now, reset discrepancy type if rejected is 0
        if (rejected === 0) {
            newItems[index].discrepancyType = 'NONE';
        } else if (newItems[index].discrepancyType === 'NONE') {
            // Optional: Default to WRONG_ITEM if user wants simplified flow?
            // Let's NOT default it yet, to force user to choose (Damaged vs Wrong)
        }

        setItems(newItems);
    };



    const handleTypeChange = (index: number, type: InboundDiscrepancyType) => {
        const newItems = [...items];
        newItems[index].discrepancyType = type;
        setItems(newItems);
    };

    const handleNotesChange = (index: number, val: string) => {
        const newItems = [...items];
        newItems[index].notes = val;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!user?.id) return;
        if (!proofFile) {
            alert('Please upload Proof of Delivery document');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload Document
            const formData = new FormData();
            formData.append('file', proofFile);
            formData.append('grnNumber', inbound.grnNumber);

            const { data: { session } } = await supabase.auth.getSession();
            const headers: HeadersInit = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const uploadRes = await fetch('/api/upload/inbound-document', {
                method: 'POST',
                headers,
                body: formData
            });

            const uploadResult = await uploadRes.json();
            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Failed to upload document');
            }

            // 2. Submit Verification
            const result = await verifyInbound({
                id: inbound.id,
                userId: user.id,
                proofDocumentPath: uploadResult.path,
                verificationNotes,
                items: items.map((item, idx) => {
                    // Logic to Auto-set Discrepancy Type
                    const expected = inbound.items[idx].expectedQuantity;
                    let type = item.discrepancyType;

                    if (item.receivedQty < expected) {
                        type = 'SHORTAGE';
                    } else if (item.receivedQty > expected) {
                        type = 'OVERAGE';
                    } else if (item.rejectedQty > 0 && (!type || type === 'NONE')) {
                        // If rejected but no reason selected, default to Damaged or force user to select (currently validation is loose)
                        // Ideally we should validate this, but for now we default to NONE or let backend handle
                    }

                    return {
                        ...item,
                        discrepancyType: type
                    };
                })
            });

            if (result.success) {
                onVerifySuccess();
                onClose();
            } else {
                alert('Failed to verify: ' + result.error);
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Verify Inbound: ${inbound.grnNumber}`} size="4xl">
            <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-3 gap-4 text-sm bg-(--color-bg-secondary) p-4 rounded-lg border border-(--color-border)">
                    <div>
                        <span className="text-(--color-text-secondary)">Vendor:</span>
                        <div className="font-medium">{inbound.vendor.name}</div>
                    </div>
                    <div>
                        <span className="text-(--color-text-secondary)">PO Number:</span>
                        <div className="font-medium">{inbound.purchaseRequest.poNumber || '-'}</div>
                    </div>
                    <div>
                        <span className="text-(--color-text-secondary)">PR Number:</span>
                        <div className="font-medium">{inbound.purchaseRequest.prNumber}</div>
                    </div>
                </div>

                {/* Proof Document Upload */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                        Proof of Delivery (Surat Jalan) *
                    </label>
                    <div className="flex items-center gap-4">
                        {proofFile ? (
                            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                <FileText className="text-green-600" size={20} />
                                <span className="text-sm font-medium">{proofFile.name}</span>
                                <button onClick={() => { setProofFile(null); setProofPreview(null); }} className="text-red-500 hover:text-red-700">
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg hover:bg-(--color-bg-hover)">
                                <Upload size={18} />
                                <span className="text-sm">Upload Document</span>
                                <input type="file" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                            </label>
                        )}
                        {proofPreview && (
                            <div className="relative h-12 w-12 rounded overflow-hidden border border-(--color-border)">
                                <img src={proofPreview} alt="Preview" className="h-full w-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="border border-(--color-border) rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-(--color-bg-secondary) text-(--color-text-secondary) font-medium text-left">
                            <tr>
                                <th className="px-4 py-3 min-w-[200px]">Item</th>
                                <th className="px-4 py-3 text-center w-24">Exp</th>
                                <th className="px-4 py-3 text-center w-24">Rcv</th>
                                <th className="px-4 py-3 text-center w-24">Acc</th>
                                <th className="px-4 py-3 text-center w-24">Rej</th>
                                <th className="px-4 py-3 min-w-[200px]">Status & Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)">
                            {inbound.items.map((item, index) => {
                                const stateItem = items[index];
                                if (!stateItem) return null;

                                const isShortage = stateItem.receivedQty < item.expectedQuantity;
                                const isOverage = stateItem.receivedQty > item.expectedQuantity;
                                const isRejected = stateItem.rejectedQty > 0;

                                return (
                                    <tr key={item.itemId}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{item.item.sku}</div>
                                            <div className="text-(--color-text-secondary)">{item.item.name}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center bg-gray-50 dark:bg-gray-800/50">
                                            {item.expectedQuantity}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Input
                                                type="number"
                                                value={stateItem.receivedQty}
                                                onChange={(e) => handleReceivedChange(index, e.target.value)}
                                                min={0}
                                                className="text-center h-8"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 py-1.5 rounded text-gray-500 font-medium">
                                                {stateItem.acceptedQty}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Input
                                                type="number"
                                                value={stateItem.rejectedQty}
                                                onChange={(e) => handleRejectedChange(index, e.target.value)}
                                                min={0}
                                                max={stateItem.receivedQty}
                                                className={`text-center h-8 ${stateItem.rejectedQty > 0 ? 'border-red-300 bg-red-50 text-red-900' : ''}`}
                                            />
                                        </td>
                                        <td className="px-4 py-3 space-y-2">
                                            {/* Discrepancy Status Indicators */}
                                            {isShortage && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                                    <AlertTriangle size={14} />
                                                    <span>Shortage: {item.expectedQuantity - stateItem.receivedQty}</span>
                                                </div>
                                            )}

                                            {isOverage && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                                    <AlertTriangle size={14} />
                                                    <span>Overage: {stateItem.receivedQty - item.expectedQuantity}</span>
                                                </div>
                                            )}

                                            {isRejected && (
                                                <div className="flex flex-col gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/30">
                                                    <span className="text-xs font-semibold text-red-600">Rejection Reason:</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleTypeChange(index, 'WRONG_ITEM')}
                                                            className={`text-xs px-2 py-1 rounded border transition-colors ${stateItem.discrepancyType === 'WRONG_ITEM'
                                                                ? 'bg-red-600 text-white border-red-600'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                                                                }`}
                                                        >
                                                            Wrong Item
                                                        </button>
                                                        <button
                                                            onClick={() => handleTypeChange(index, 'DAMAGED')}
                                                            className={`text-xs px-2 py-1 rounded border transition-colors ${stateItem.discrepancyType === 'DAMAGED'
                                                                ? 'bg-red-600 text-white border-red-600'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                                                                }`}
                                                        >
                                                            Damaged
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <Input
                                                value={stateItem.notes || ''}
                                                onChange={(e) => handleNotesChange(index, e.target.value)}
                                                placeholder="Remarks..."
                                                className="text-xs h-7"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Overall Notes */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                        Verification Notes
                    </label>
                    <Textarea
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="General notes about this inbound..."
                        rows={3}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-(--color-border)">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" size={18} />}
                        Confirm Verification
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
