'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface JustificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { reason: string; document?: string }) => void;
    itemsExceedingBudget: Array<{
        name: string;
        requestedQty?: number;
        budgetQty?: number;
        isNotInRab?: boolean;
    }>;
}

export default function JustificationModal({
    isOpen,
    onClose,
    onSubmit,
    itemsExceedingBudget
}: JustificationModalProps) {
    const [reason, setReason] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only PDF, JPG, and PNG are allowed');
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size exceeds 10MB limit');
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            alert('Please provide a justification reason');
            return;
        }

        setIsSubmitting(true);

        try {
            let documentPath: string | undefined;

            // Upload file if one was selected
            if (selectedFile) {
                // Get auth session for verified upload
                const { data: { session } } = await supabase.auth.getSession();
                const headers: HeadersInit = {};

                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const formData = new FormData();
                formData.append('file', selectedFile);

                const response = await fetch('/api/upload/justification-document', {
                    method: 'POST',
                    headers,
                    body: formData
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to upload file');
                }

                documentPath = result.path;
            }

            onSubmit({
                reason: reason.trim(),
                document: documentPath
            });

            // Reset form
            setReason('');
            setSelectedFile(null);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Failed to upload file: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setReason('');
        setSelectedFile(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} title="Budget Justification Required">
            <div className="space-y-4">
                {/* Warning Banner */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                This PR exceeds the RAB budget or includes non-RAB items
                            </h4>
                            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                {itemsExceedingBudget.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span>
                                            <strong>{item.name}</strong>
                                            {item.isNotInRab ? (
                                                <span className="text-red-600 dark:text-red-400"> - Not in RAB</span>
                                            ) : (
                                                <span> - Requested: {item.requestedQty}, Budget: {item.budgetQty}</span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reason Field */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        Justification Reason <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explain why these items are needed despite exceeding the budget or not being in the RAB. This will be reviewed by the manager during approval."
                        rows={5}
                        className="w-full"
                        autoFocus
                    />
                    <p className="text-xs text-(--color-text-muted) mt-1">
                        Minimum 10 characters required
                    </p>
                </div>

                {/* Document Upload */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                        Supporting Document (Optional but Recommended)
                    </label>
                    {selectedFile ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileText className="text-green-600" size={20} />
                                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                    {selectedFile.name}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="text-red-600 hover:text-red-700"
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-(--color-border) rounded-lg p-6 cursor-pointer hover:bg-(--color-bg-hover) transition-colors">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={isSubmitting}
                            />
                            <div className="flex flex-col items-center">
                                <Upload className="text-(--color-text-muted) mb-2" size={32} />
                                <p className="text-sm text-(--color-text-primary) mb-1">
                                    Click to select document
                                </p>
                                <p className="text-xs text-(--color-text-muted)">
                                    PDF, JPG, or PNG (max 10MB)
                                </p>
                            </div>
                        </label>
                    )}
                </div>

                {/* Info Message */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>ℹ️ Note:</strong> This justification will be visible to the manager during PR approval.
                        Provide clear reasoning to increase approval chances.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-(--color-border)">
                    <Button
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="border-(--color-border)"
                    >
                        Cancel Submission
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || reason.trim().length < 10}
                        className="bg-(--color-primary) hover:bg-(--color-primary)/90 text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit with Justification'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
