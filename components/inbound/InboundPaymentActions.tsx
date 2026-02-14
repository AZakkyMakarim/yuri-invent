'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { approveInboundForPayment, processInboundPayment } from '@/app/actions/inbound';
import { Loader2, DollarSign, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Upload, X, FileText } from 'lucide-react';

interface InboundPaymentActionsProps {
    inboundId: string;
    status: string;
    vendorType: string;
}

export default function InboundPaymentActions({ inboundId, status, vendorType }: InboundPaymentActionsProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isPymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Payment Form State
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [proofFile, setProofFile] = useState<File | null>(null);

    const handleApprove = async () => {
        if (!user?.id) return;
        if (!confirm('Are you sure you want to approve this Inbound for payment?')) return;

        setIsLoading(true);
        const res = await approveInboundForPayment(inboundId, user.id);
        setIsLoading(false);

        if (!res.success) {
            alert(res.error);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!user?.id) return;
        if (!amount || !paymentDate) {
            alert('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            let proofUrl = undefined;
            if (proofFile) {
                const formData = new FormData();
                formData.append('file', proofFile);
                formData.append('inboundId', inboundId);

                // Assuming reusing existng upload endpoint or similar
                const { data: { session } } = await supabase.auth.getSession();
                const headers: HeadersInit = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                // Use generic upload or specific?
                // Let's use inbound-document upload for now, or create new one?
                // Using same endpoint is fine if it handles different folder logic or same folder.
                const uploadRes = await fetch('/api/upload/inbound-document', {
                    method: 'POST',
                    headers,
                    body: formData
                });
                const uploadResult = await uploadRes.json();
                if (!uploadResult.success) throw new Error(uploadResult.error);
                proofUrl = uploadResult.path;
            }

            const res = await processInboundPayment({
                inboundId,
                userId: user.id,
                paymentAmount: parseFloat(amount),
                paymentDate: new Date(paymentDate),
                paymentProofUrl: proofUrl
            });

            if (res.success) {
                setIsPaymentModalOpen(false);
            } else {
                alert(res.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (vendorType !== 'SPK') return null;

    if (status === 'COMPLETED') {
        return (
            <Button onClick={handleApprove} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" size={16} />}
                Approve for Payment
            </Button>
        );
    }

    if (status === 'READY_FOR_PAYMENT') {
        return (
            <>
                <Button onClick={() => setIsPaymentModalOpen(true)} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <DollarSign className="mr-2" size={16} />}
                    Realize Payment
                </Button>

                <Modal isOpen={isPymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Realize Payment">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Payment Amount</label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Enter amount"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Payment Date</label>
                            <Input
                                type="date"
                                value={paymentDate}
                                onChange={e => setPaymentDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Proof of Payment</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={e => setProofFile(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                            <Button onClick={handlePaymentSubmit} disabled={isLoading}>Submit Payment</Button>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }

    return null;
}
