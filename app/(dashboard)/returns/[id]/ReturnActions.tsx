'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle, XCircle, Truck, CheckSquare } from 'lucide-react';
import { submitReturn, approveReturn, rejectReturn, markReturnAsSent, completeReturn } from '@/app/actions/return';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';

interface ReturnActionsProps {
    id: string;
    status: string;
    approvedBy?: any;
    sentToVendorAt?: Date | null;
}

export default function ReturnActions({ id, status, approvedBy, sentToVendorAt }: ReturnActionsProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [processing, setProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const isDraft = status === 'DRAFT';
    const isPending = status === 'PENDING_APPROVAL';
    const isApproved = status === 'APPROVED';
    const isSent = status === 'SENT_TO_VENDOR';

    // Check permissions (simplified)
    const canApprove = user?.role?.name === 'Manager' || user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';
    const canAction = !!user;

    const handleAction = async (action: string) => {
        if (!user) return;
        setProcessing(true);
        let res;

        try {
            switch (action) {
                case 'SUBMIT':
                    res = await submitReturn(id);
                    break;
                case 'APPROVE':
                    res = await approveReturn(id, user.id);
                    break;
                case 'REJECT':
                    if (!rejectReason) {
                        alert("Please provide a rejection reason");
                        setProcessing(false);
                        return;
                    }
                    res = await rejectReturn(id, user.id, rejectReason);
                    break;
                case 'SEND':
                    res = await markReturnAsSent(id);
                    break;
                case 'COMPLETE':
                    res = await completeReturn(id);
                    break;
            }

            if (res?.success) {
                setShowRejectModal(false);
                router.refresh(); // Refresh server component data
            } else {
                alert('Action failed: ' + res?.error);
            }
        } catch (error: any) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setProcessing(false);
        }
    };

    if (!canAction) return null;

    return (
        <div className="flex gap-2">
            {isDraft && (
                <Button onClick={() => handleAction('SUBMIT')} disabled={processing}>
                    {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Submit for Approval
                </Button>
            )}

            {isPending && canApprove && (
                <>
                    <Button onClick={() => setShowRejectModal(true)} variant="danger" disabled={processing}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => handleAction('APPROVE')} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                </>
            )}

            {isApproved && (
                <Button onClick={() => handleAction('SEND')} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}
                    Mark as Sent
                </Button>
            )}

            {isSent && (
                <Button onClick={() => handleAction('COMPLETE')} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
                    {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                    Complete Return
                </Button>
            )}

            {/* Reject Modal */}
            <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Return">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-red-800">Rejection Reason</label>
                        <Input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Why is this being rejected?"
                            className="bg-white"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                        <Button variant="danger" onClick={() => handleAction('REJECT')} disabled={processing}>Confirm Reject</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
