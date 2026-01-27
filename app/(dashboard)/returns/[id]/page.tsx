'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Truck, CheckSquare, Printer } from 'lucide-react';
import { getReturnById, submitReturn, approveReturn, rejectReturn, markReturnAsSent, completeReturn } from '@/app/actions/return';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ReturnStatus } from '@prisma/client';

export default function ReturnDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [returnData, setReturnData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    useEffect(() => {
        fetchReturn();
    }, [id]);

    const fetchReturn = async () => {
        setLoading(true);
        const res = await getReturnById(id);
        if (res.success) {
            setReturnData(res.data);
        } else {
            alert(res.error);
            router.push('/returns');
        }
        setLoading(false);
    };

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
                await fetchReturn();
                setShowRejectInput(false);
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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
        );
    }

    if (!returnData) return null;

    const isDraft = returnData.status === 'DRAFT';
    const isPending = returnData.status === 'PENDING_APPROVAL';
    const isApproved = returnData.status === 'APPROVED';
    const isSent = returnData.status === 'SENT_TO_VENDOR';
    const isCompleted = returnData.status === 'COMPLETED';

    // Check permissions (simplified)
    const canApprove = user?.role?.name === 'Manager' || user?.role?.name === 'Admin';

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/returns">
                        <Button variant="ghost" size="md">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{returnData.returnCode}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium 
                                ${returnData.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                    returnData.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                {returnData.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Ref PR: {returnData.purchaseRequest?.prNumber || '-'} • Created by {returnData.createdBy?.name} on {formatDate(returnData.createdAt)}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Action Buttons */}
                    {isDraft && (
                        <Button onClick={() => handleAction('SUBMIT')} disabled={processing}>
                            {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Submit for Approval
                        </Button>
                    )}

                    {isPending && canApprove && (
                        <>
                            <Button onClick={() => setShowRejectInput(true)} variant="danger" disabled={processing}>
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                            <Button onClick={() => handleAction('APPROVE')} disabled={processing} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        </>
                    )}

                    {isApproved && (
                        <Button onClick={() => handleAction('SEND')} disabled={processing}>
                            <Truck className="mr-2 h-4 w-4" /> Mark as Sent
                        </Button>
                    )}

                    {isSent && (
                        <Button onClick={() => handleAction('COMPLETE')} disabled={processing} className="bg-green-600 hover:bg-green-700">
                            <CheckSquare className="mr-2 h-4 w-4" /> Complete Return
                        </Button>
                    )}

                    {/* Print Button (Placeholder) */}
                    <Button variant="ghost">
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>
            </div>

            {/* Reject Input */}
            {showRejectInput && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                            <Input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Why is this being rejected?"
                                className="bg-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                            <Button variant="danger" onClick={() => handleAction('REJECT')} disabled={processing}>Confirm Reject</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-lg mb-4">Returned Items</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Item</th>
                                            <th className="px-4 py-2 text-right">Qty</th>
                                            <th className="px-4 py-2 text-right">Unit Price</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                            <th className="px-4 py-2 text-left">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {returnData.items.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{item.item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.item.sku}</p>
                                                </td>
                                                <td className="px-4 py-3 text-right">{item.quantity} {item.item.uom?.symbol}</td>
                                                <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(item.totalPrice))}</td>
                                                <td className="px-4 py-3 text-gray-500 italic">{item.reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg">Vendor Details</h3>
                            <div>
                                <p className="text-sm text-gray-500">Vendor Name</p>
                                <p className="font-medium">{returnData.vendor.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Address</p>
                                <p className="text-sm">{returnData.vendor.address || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Code</p>
                                <p className="text-sm font-mono bg-gray-100 inline-block px-1 rounded">{returnData.vendor.code}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg">Approval Info</h3>
                            {returnData.status === 'PENDING_APPROVAL' ? (
                                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm flex items-center gap-2">
                                    <Loader2 className="animate-spin h-4 w-4" /> Awaiting Management Approval
                                </div>
                            ) : returnData.approvedBy ? (
                                <div>
                                    <p className="text-sm text-gray-500">{returnData.status === 'REJECTED' ? 'Rejected By' : 'Approved By'}</p>
                                    <p className="font-medium">{returnData.approvedBy.name}</p>
                                    <p className="text-xs text-gray-500">{formatDate(returnData.approvedAt)}</p>
                                    {returnData.approvalNotes && (
                                        <div className="mt-2 p-2 bg-gray-50 text-xs italic border-l-2 border-gray-300">
                                            "{returnData.approvalNotes}"
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No approval data yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
