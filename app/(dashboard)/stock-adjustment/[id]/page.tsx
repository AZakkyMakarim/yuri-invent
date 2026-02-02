'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
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
            const result = await approveStockAdjustment(data.id, 'cm5us36e30000u8x8g6r62i3z', 'Approved via Web Dashboard');
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
            const result = await rejectStockAdjustment(data.id, 'cm5us36e30000u8x8g6r62i3z', reason || 'Rejected via Web Dashboard');
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
            DRAFT: 'bg-gray-100 text-gray-700',
            PENDING: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
                {status}
            </span>
        );
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
                        <CardHeader>Information</CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Type</div>
                                <div className="font-medium bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                                    {data.adjustmentType.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Created By</div>
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-gray-400" />
                                    <span className="font-medium">{data.createdBy?.name || 'Unknown'}</span>
                                </div>
                                <div className="text-xs text-gray-400 ml-6">{data.createdBy?.role?.name}</div>
                            </div>
                            {data.notes && (
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Notes</div>
                                    <div className="text-sm italic bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-gray-700 dark:text-gray-300">
                                        "{data.notes}"
                                    </div>
                                </div>
                            )}

                            {data.status === 'APPROVED' && (
                                <div className="pt-4 border-t">
                                    <div className="text-sm text-gray-500 mb-1">Approved By</div>
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                        <CheckCircle size={16} />
                                        <span className="font-medium">{data.approvedBy?.name || 'System'}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 ml-6">
                                        {format(new Date(data.approvedAt), 'dd MMM yyyy HH:mm')}
                                    </div>
                                </div>
                            )}

                            {data.status === 'REJECTED' && (
                                <div className="pt-4 border-t">
                                    <div className="text-sm text-gray-500 mb-1">Rejected By</div>
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                        <XCircle size={16} />
                                        <span className="font-medium">{data.approvedBy?.name || 'System'}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 ml-6">
                                        {format(new Date(data.approvedAt), 'dd MMM yyyy HH:mm')}
                                    </div>
                                    {data.approvalNotes && (
                                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                            Reason: {data.approvalNotes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Items */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>Adjusted Items ({data.items.length})</CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead>Item Details</TableHead>
                                        <TableHead className="text-right">System</TableHead>
                                        <TableHead className="text-right">Adjusted</TableHead>
                                        <TableHead className="text-right">Variance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.item.name}</div>
                                                <div className="text-xs text-gray-500">{item.item.sku}</div>
                                                {item.reason && (
                                                    <div className="text-xs text-gray-400 mt-1 italic">
                                                        Note: {item.reason}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-500">
                                                {item.systemQty} {item.item.uom?.symbol}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {item.adjustedQty} {item.item.uom?.symbol}
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                {item.variance > 0 ? '+' : ''}{item.variance}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
