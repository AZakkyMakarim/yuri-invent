'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOutboundById, approveOutbound, releaseOutbound, rejectOutbound } from '@/app/actions/outbound';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Loader2, ArrowLeft, CheckCircle, Truck, FileText, User, XCircle, Package, AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";

export default function OutboundDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Release State
    const [releaseQtys, setReleaseQtys] = useState<Record<string, number>>({});

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string);
        }
    }, [params.id]);

    const loadData = async (id: string) => {
        setLoading(true);
        const result = await getOutboundById(id);
        if (result.success && result.data) {
            setData(result.data);
            // Initialize release quantities with requested quantities by default
            const outboundData = result.data as any; // Type assertion to access items
            if (outboundData.status === 'APPROVED' && outboundData.items?.length > 0) {
                const initialQtys: Record<string, number> = {};
                outboundData.items.forEach((item: any) => {
                    initialQtys[item.id] = item.requestedQty;
                });
                setReleaseQtys(initialQtys);
            }
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        if (!confirm("Are you sure you want to Approve this request?")) return;
        setIsProcessing(true);
        const result = await approveOutbound(data.id, user?.id || '');
        if (result.success) {
            loadData(data.id);
        } else {
            alert('Error: ' + result.error);
        }
        setIsProcessing(false);
    };

    const handleReject = async () => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;

        setIsProcessing(true);
        const result = await rejectOutbound(data.id, user?.id || '', reason);
        if (result.success) {
            loadData(data.id);
        } else {
            alert('Error: ' + result.error);
        }
        setIsProcessing(false);
    };

    const handleRelease = async () => {
        const itemsToRelease = Object.entries(releaseQtys).map(([id, qty]) => ({
            id,
            releasedQty: qty
        }));

        // Client-side Validation
        const conflicts = itemsToRelease.filter(r => {
            const original = data.items.find((i: any) => i.id === r.id);
            return r.releasedQty > original.requestedQty || r.releasedQty < 0;
        });

        if (conflicts.length > 0) {
            alert("Invalid quantities detected. Release qty cannot exceed requested qty.");
            return;
        }

        if (!confirm(`Confirm release of items? This will deduct stock from ${data.warehouse?.name}.`)) return;

        setIsProcessing(true);
        const result = await releaseOutbound({
            id: data.id,
            userId: user?.id || '',
            items: itemsToRelease
        });

        if (result.success) {
            loadData(data.id);
        } else {
            alert('Release Failed: ' + result.error);
        }
        setIsProcessing(false);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
            APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
            RELEASED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
        };
        const colorClass = styles[status as keyof typeof styles] || styles.DRAFT;

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                {status}
            </span>
        );
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!data) return <div className="p-8 text-center">Outbound Request not found</div>;

    // Segregation of duties: Approver cannot release UNLESS they are ADMIN (superadmin)
    const canRelease = data.status === 'APPROVED';


    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header / Nav */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/outbound">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft size={18} /> Back
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold font-mono tracking-tight">{data.outboundCode}</h1>
                            {getStatusBadge(data.status)}
                            {data.type && <span className="text-xs text-gray-500 uppercase font-mono px-2 py-0.5 bg-gray-100 rounded border">{data.type}</span>}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Requested by <span className="font-medium text-gray-700">{data.createdBy?.name}</span> on {format(new Date(data.requestDate), 'dd MMM yyyy, HH:mm')}
                        </p>
                    </div>
                </div>

                {/* Main Actions */}
                <div className="flex gap-3">
                    {data.status === 'DRAFT' && (
                        <>
                            <Button onClick={handleReject} disabled={isProcessing} variant="danger" className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200">
                                <XCircle size={16} className="mr-2" />
                                Reject
                            </Button>
                            <Button onClick={handleApprove} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                <CheckCircle size={16} className="mr-2" />
                                Approve Request
                            </Button>
                        </>
                    )}
                    {data.status === 'APPROVED' && (
                        <>
                            {!canRelease && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 mr-2">
                                    <ShieldCheck size={14} />
                                    <span>Wait for Warehouse Release</span>
                                </div>
                            )}
                            {canRelease && (
                                <Button onClick={handleRelease} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm animate-pulse">
                                    <Package size={16} className="mr-2" />
                                    Confirm Release (Stock Cut)
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden border-2 border-gray-100 dark:border-gray-800">
                        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b pb-4">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText size={18} className="text-gray-500" />
                                    Items Manifest
                                </CardTitle>
                                <span className="text-xs text-gray-500">{data.items.length} items</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/30">
                                        <TableHead className="w-[40%]">Item Description</TableHead>
                                        <TableHead className="text-center w-[15%]">Request</TableHead>
                                        <TableHead className="text-center w-[15%]">Status</TableHead>
                                        <TableHead className="text-right w-[30%]">
                                            {data.status === 'APPROVED' ? 'Confirm Release' : 'Released Qty'}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.items.map((item: any) => {
                                        const isApproved = data.status === 'APPROVED';
                                        const currentStock = item.item.currentStock;
                                        const requested = item.requestedQty;
                                        const released = isApproved ? (releaseQtys[item.id] ?? requested) : item.releasedQty;
                                        const hasStockIssue = isApproved && released > currentStock;

                                        return (
                                            <TableRow key={item.id} className={hasStockIssue ? 'bg-red-50' : ''}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{item.item.sku}</span>
                                                        <span className="text-sm text-gray-600">{item.item.name}</span>
                                                        {item.notes && <span className="text-xs text-amber-600 italic mt-0.5">{item.notes}</span>}
                                                        {isApproved && (
                                                            <span className={`text-xs mt-1 ${currentStock < requested ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                                                Stock Available: {currentStock} {item.item.uom?.symbol}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-base">
                                                    {item.requestedQty}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {data.status === 'RELEASED' && item.releasedQty < item.requestedQty ? (
                                                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">Partial</Badge>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isApproved && canRelease ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={item.requestedQty}
                                                                className={`w-20 text-right h-8 ${hasStockIssue ? 'border-red-500 text-red-600' : ''}`}
                                                                value={releaseQtys[item.id] ?? item.requestedQty}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setReleaseQtys(prev => ({ ...prev, [item.id]: val }));
                                                                }}
                                                            />
                                                            <span className="text-xs text-gray-500 w-8">{item.item.uom?.symbol}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`font-mono font-bold ${data.status === 'RELEASED' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                            {item.releasedQty} {item.item.uom?.symbol}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Stock Issue Warning */}
                    {data.status === 'APPROVED' && Object.entries(releaseQtys).some(([id, qty]) => {
                        const item = data.items.find((i: any) => i.id === id);
                        return item && qty > item.item.currentStock;
                    }) && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-3">
                                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm">Insufficient Stock Warning</h4>
                                    <p className="text-sm mt-1">Some items have release quantities exceeding available stock. Please adjust quantities before confirming release.</p>
                                </div>
                            </div>
                        )}
                </div>

                {/* Right Column: Info & Workflow Trail */}
                <div className="space-y-6">
                    {(data.approvedBy || data.releasedBy) && (
                        <Card>
                            <CardHeader className="pb-3 border-b bg-gray-50/50">
                                <CardTitle className="text-sm font-semibold uppercase text-gray-500">Approvals</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {data.approvedBy && (
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <CheckCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Approved</p>
                                            <p className="text-xs text-gray-500">{data.approvedBy.name}</p>
                                            <p className="text-xs text-gray-400">{format(new Date(data.approvedAt), 'dd MMM HH:mm')}</p>
                                        </div>
                                    </div>
                                )}
                                {data.releasedBy && (
                                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <Package size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Released</p>
                                            <p className="text-xs text-gray-500">{data.releasedBy.name}</p>
                                            <p className="text-xs text-gray-400">{format(new Date(data.releasedAt), 'dd MMM HH:mm')}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3 border-b bg-gray-50/50">
                            <CardTitle className="text-sm font-semibold uppercase text-gray-500">Delivery Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Destination Rule</label>
                                <div className="flex items-center gap-2">
                                    <Truck size={16} className="text-gray-400" />
                                    <span className="font-medium text-sm">{data.partner?.name || 'Internal Usage / No Partner'}</span>
                                </div>
                            </div>

                            {data.warehouse && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Source Warehouse</label>
                                    <div className="text-sm">{data.warehouse.name}</div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Purpose</label>
                                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                                    {data.purpose || 'No specific purpose'}
                                </div>
                            </div>

                            {data.notes && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Notes</label>
                                    <div className="text-xs italic text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100">
                                        "{data.notes}"
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
