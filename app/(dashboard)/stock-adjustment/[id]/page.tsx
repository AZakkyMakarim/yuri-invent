'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle, User, Calendar, FileText, AlertTriangle, Package, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { getStockAdjustmentById, approveStockAdjustment, rejectStockAdjustment } from '@/app/actions/stock-adjustment';

export default function StockAdjustmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string);
        }
    }, [params.id]);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            const result = await getStockAdjustmentById(id);
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to load detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this adjustment? Stock levels will be updated immediately.')) return;

        setProcessing(true);
        try {
            // Using placeholder User ID for now - ideally typically from session
            const result = await approveStockAdjustment(data.id, '3c014909-ecd7-4e61-ae1c-c71c7ae819f9', 'Approved via Web Dashboard');
            if (result.success) {
                alert('Stock adjustment approved successfully');
                loadData(data.id);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to approve:', error);
            alert('Failed to approve adjustment');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt('Enter rejection reason:');
        if (reason === null) return; // Cancelled

        setProcessing(true);
        try {
            const result = await rejectStockAdjustment(data.id, '3c014909-ecd7-4e61-ae1c-c71c7ae819f9', reason || 'Rejected via Web Dashboard');
            if (result.success) {
                alert('Stock adjustment rejected');
                loadData(data.id);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to reject:', error);
            alert('Failed to reject adjustment');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700',
            PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
                {status}
            </span>
        );
    };

    const getTypeColorRaw = (type: string) => {
        const colors: any = {
            OPNAME_RESULT: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
            DAMAGED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
            EXPIRED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
            MANUAL_WRITEOFF: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
            OTHER: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
        };
        return colors[type] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading detail...</div>;
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500">Adjustment not found</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/stock-adjustment">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{data.adjustmentCode}</h1>
                            {getStatusBadge(data.status)}
                        </div>
                        <p className="text-gray-500">Created on {format(new Date(data.createdAt), 'dd MMMM yyyy HH:mm')}</p>
                    </div>
                </div>

                {/* Actions for PENDING status */}
                {data.status === 'PENDING' && (
                    <div className="flex gap-3">
                        <Button
                            onClick={handleReject}
                            disabled={processing}
                            variant="danger"
                            className="flex items-center gap-2"
                        >
                            <XCircle size={16} />
                            Reject
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={processing}
                            variant="primary"
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                            <CheckCircle size={16} />
                            Approve Adjustment
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Info */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="text-lg font-semibold">Information</CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Source & Type</div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 w-16 dark:text-gray-400">Source:</span>
                                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                            {data.adjustmentSource}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 w-16 dark:text-gray-400">Type:</span>
                                        <span className={`font-medium px-2 py-0.5 rounded text-sm border ${getTypeColorRaw(data.adjustmentType)}`}>
                                            {data.adjustmentType.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {data.adjustmentMethod && (
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Method</div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        {data.adjustmentMethod.replace(/_/g, ' ')}
                                        {data.deltaType && (
                                            <span className={`text-xs px-2 py-0.5 rounded border ${data.deltaType === 'INCREASE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {data.deltaType}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Created By</div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-gray-100 p-1.5 rounded-full">
                                        <User size={14} className="text-gray-500" />
                                    </div>
                                    <span className="font-medium text-sm">{data.createdBy?.name || 'Unknown'}</span>
                                </div>
                                <div className="text-xs text-gray-400 ml-9">{data.createdBy?.role?.name}</div>
                            </div>

                            {data.notes && (
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Notes</div>
                                    <div className="text-sm italic bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded text-gray-700 border border-yellow-100">
                                        "{data.notes}"
                                    </div>
                                </div>
                            )}

                            {data.status === 'APPROVED' && (
                                <div className="pt-4 border-t">
                                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Approved By</div>
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                        <div className="bg-green-50 p-1 rounded-full">
                                            <CheckCircle size={14} />
                                        </div>
                                        <span className="font-medium text-sm">{data.approvedBy?.name || 'System'}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 ml-8">
                                        {format(new Date(data.approvedAt), 'dd MMM yyyy HH:mm')}
                                    </div>
                                </div>
                            )}

                            {data.status === 'REJECTED' && (
                                <div className="pt-4 border-t">
                                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Rejected By</div>
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                        <div className="bg-red-50 p-1 rounded-full">
                                            <XCircle size={14} />
                                        </div>
                                        <span className="font-medium text-sm">{data.approvedBy?.name || 'System'}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 ml-8">
                                        {format(new Date(data.approvedAt), 'dd MMM yyyy HH:mm')}
                                    </div>
                                    {data.approvalNotes && (
                                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                            Reason: {data.approvalNotes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Item Details */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="text-lg font-semibold border-b bg-gray-50/50 dark:bg-gray-800/50 dark:border-gray-700 font-sans flex justify-between items-center">
                            <span>Adjustment Items</span>
                            <span className="text-sm font-normal text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border shadow-sm">
                                {data.adjustmentItems?.length || 0} items
                            </span>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-medium border-b dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3">Item</th>
                                            <th className="px-6 py-3 text-center">Method</th>
                                            <th className="px-6 py-3 text-right">System Qty</th>
                                            <th className="px-6 py-3 text-right">Input</th>
                                            <th className="px-6 py-3 text-right">Variance</th>
                                            <th className="px-6 py-3 text-right">Final</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {(data.adjustmentItems || []).length > 0 ? (
                                            data.adjustmentItems.map((adjItem: any) => {
                                                const variance = adjItem.qtyVariance;
                                                const finalQty = adjItem.qtySystem + variance;
                                                const isReal = adjItem.adjustmentMethod === 'REAL_QTY';

                                                return (
                                                    <tr key={adjItem.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">{adjItem.item?.name}</span>
                                                                <span className="text-xs text-gray-500 font-mono mt-0.5">{adjItem.item?.sku}</span>
                                                                {adjItem.notes && (
                                                                    <div className="text-xs italic text-amber-600 mt-1 dark:text-amber-500">
                                                                        Note: {adjItem.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${isReal
                                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30'
                                                                        : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30'
                                                                    }`}>
                                                                    {isReal ? 'Real Count' : 'Delta'}
                                                                </span>
                                                                {!isReal && adjItem.deltaType && (
                                                                    <span className={`text-[9px] mt-1 ${adjItem.deltaType === 'INCREASE' ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {adjItem.deltaType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-400">
                                                            {adjItem.qtySystem} <span className="text-xs text-gray-400 ml-0.5">{adjItem.item?.uom?.symbol}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-medium">
                                                            {adjItem.qtyInput}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${variance > 0
                                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                                : variance < 0
                                                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
                                                                }`}>
                                                                {variance > 0 ? '+' : ''}{variance}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                                                            {finalQty}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            // Fallback for purely legacy data if migration failed
                                            <tr className="bg-yellow-50/50">
                                                <td className="px-6 py-4" colSpan={6}>
                                                    <div className="flex items-center justify-center gap-2 text-yellow-700 py-4">
                                                        <AlertTriangle size={16} />
                                                        <span>Legacy data format displayed below</span>
                                                    </div>
                                                    {/* Render Legacy Single Item Style inside row if needed, or just redirect user info */}
                                                    <div className="border rounded bg-white p-4 max-w-lg mx-auto shadow-sm">
                                                        <div className="font-medium">{data.item?.name}</div>
                                                        <div className="grid grid-cols-2 mt-2 gap-4 text-sm">
                                                            <div>System: {data.qtySystem}</div>
                                                            <div>Variance: {data.qtyVariance > 0 ? '+' : ''}{data.qtyVariance}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
