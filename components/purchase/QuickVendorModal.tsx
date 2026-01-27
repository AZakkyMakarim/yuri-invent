'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createVendor } from '@/app/actions/vendors';
import { Loader2, AlertCircle } from 'lucide-react';

interface QuickVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (vendor: any) => void;
}

export default function QuickVendorModal({ isOpen, onClose, onSuccess }: QuickVendorModalProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Vendor Name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createVendor({ name, phone, address });
            if (result.success && result.data) {
                onSuccess(result.data);
                onClose();
                // Reset form
                setName('');
                setPhone('');
                setAddress('');
            } else {
                setError(result.error || 'Failed to create vendor');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Vendor"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                        Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. PT. Mitra Abadi"
                        disabled={isSubmitting}
                        className="bg-(--color-bg-secondary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                        Phone (Optional)
                    </label>
                    <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 021-5555555"
                        disabled={isSubmitting}
                        className="bg-(--color-bg-secondary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                        Address (Optional)
                    </label>
                    <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Jl. Industri No. 1"
                        disabled={isSubmitting}
                        className="bg-(--color-bg-secondary)"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-(--color-primary) text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                creating...
                            </>
                        ) : (
                            'Create Vendor'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
