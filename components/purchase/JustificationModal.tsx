'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('purchase.justification');
    const [reason, setReason] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert(t('errors.invalidType'));
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert(t('errors.fileTooLarge'));
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            alert(t('errors.reasonRequired'));
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
                    throw new Error(result.error || t('errors.uploadFailed'));
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
            console.error('Submission failed:', error);
            alert(error.message || t('errors.submissionFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
        >
            <div className="py-4 space-y-6">
                {/* Warning Section */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-orange-900 dark:text-orange-300 text-sm">
                                {t('warningTitle')}
                            </h4>
                            <p className="text-xs text-orange-800 dark:text-orange-400 mt-1 mb-2">
                                {itemsExceedingBudget.length > 0 ? t('warningDescription') : t('warningDescriptionGeneral')}
                            </p>
                            {itemsExceedingBudget.length > 0 && (
                                <ul className="list-disc list-inside text-xs text-orange-700 dark:text-orange-400 space-y-1">
                                    {itemsExceedingBudget.map((item, idx) => (
                                        <li key={idx}>
                                            <span className="font-medium">{item.name}</span>
                                            {item.isNotInRab ? (
                                                ` - ${t('reasonNotInRab')}`
                                            ) : (
                                                ` - ${t('reasonExceedsRab', { requested: item.requestedQty ?? 0, budget: item.budgetQty ?? 0 })}`
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reason Input */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                        {t('fields.reason')} <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t('fields.reasonPlaceholder')}
                        className="bg-(--color-bg-secondary) min-h-[100px]"
                    />
                </div>

                {/* File Upload */}
                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                        {t('fields.supportingDoc')}
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-(--color-border) rounded-md hover:bg-(--color-bg-secondary)/50 transition-colors">
                        <div className="space-y-1 text-center">
                            {selectedFile ? (
                                <div className="flex flex-col items-center">
                                    <FileText className="mx-auto h-12 w-12 text-blue-500" />
                                    <div className="flex text-sm text-(--color-text-primary) mt-2">
                                        <span className="font-medium">{selectedFile.name}</span>
                                    </div>
                                    <p className="text-xs text-(--color-text-secondary)">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium flex items-center"
                                    >
                                        <X size={12} className="mr-1" />
                                        {t('removeFile')}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="mx-auto h-12 w-12 text-(--color-text-muted)" />
                                    <div className="flex text-sm text-(--color-text-secondary)">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer bg-transparent rounded-md font-medium text-(--color-primary) hover:text-(--color-primary)/80 focus-within:outline-hidden"
                                        >
                                            <span>{t('uploadText')}</span>
                                            <input
                                                id="file-upload"
                                                name="file-upload"
                                                type="file"
                                                className="sr-only"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileSelect}
                                            />
                                        </label>
                                        <p className="pl-1">{t('dragDropText')}</p>
                                    </div>
                                    <p className="text-xs text-(--color-text-muted)">
                                        {t('fileConstraints')}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!reason.trim() || isSubmitting}
                        className="bg-(--color-primary) text-white"
                    >
                        {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                        {t('submit')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
