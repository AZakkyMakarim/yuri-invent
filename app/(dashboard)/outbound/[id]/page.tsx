'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOutboundById } from '@/app/actions/outbound'; // Ensure this uses 'use server' inside
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, ArrowLeft, CheckCircle, Truck, FileText, User } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
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
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string);
        }
    }, [params.id]);

    const loadData = async (id: string) => {
        setLoading(true);
        const result = await getOutboundById(id);
        if (result.success) {
            setData(result.data);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        if (!confirm("Are you sure you want to Approve this request? Warehouse will be notified.")) return;
        setIsApproving(true);
        // TODO: Implement approveOutbound server action
        // await approveOutbound(data.id);
        await new Promise(r => setTimeout(r, 1000)); // Mock
        alert("Approved! (Mock)");
        setIsApproving(false);
        loadData(data.id); // Refresh
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-(--color-primary)" /></div>;
    if (!data) return <div className="p-8 text-center">Outbound Request not found</div>;

    const getStatusBadge = (status: string) => {
        let color = "bg-gray-100 text-gray-800";
        if (status === 'DRAFT') color = "bg-gray-100 text-gray-800";
        if (status === 'APPROVED') color = "bg-blue-100 text-blue-800";
        if (status === 'RELEASED') color = "bg-green-100 text-green-800";
        if (status === 'REJECTED') color = "bg-red-100 text-red-800";
        return <Badge className={color}>{status}</Badge>;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/outbound">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {data.outboundCode}
                            {getStatusBadge(data.status)}
                        </h1>
                        <p className="text-(--color-text-secondary)">
                            Requested on {format(new Date(data.requestDate), 'dd MMM yyyy, HH:mm')} by {data.createdBy?.name}
                        </p>
                    </div>
                </div>

                {data.status === 'DRAFT' && (
                    <Button onClick={handleApprove} isLoading={isApproving} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <CheckCircle size={18} className="mr-2" />
                        Approve Request
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Items Table */}
                    <Card>
                        <CardHeader className="pb-2 border-b border-(--color-border)">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText size={18} /> Items List
                            </h3>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead className="text-center">Req Qty</TableHead>
                                        <TableHead className="text-center">Rel Qty</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-sm">{item.item.sku}</TableCell>
                                            <TableCell>{item.item.name}</TableCell>
                                            <TableCell className="text-center font-bold">{item.requestedQty}</TableCell>
                                            <TableCell className="text-center text-gray-500">{item.releasedQty}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{item.notes || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Destination Info */}
                    <Card>
                        <CardHeader className="pb-2 border-b border-(--color-border)">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Truck size={18} /> Destination
                            </h3>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Mitra / Customer</label>
                                <p className="font-medium">{data.mitra?.name || 'Internal Usage'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Purpose</label>
                                <p>{data.purpose || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Notes</label>
                                <p className="text-sm italic">{data.notes || 'No notes'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Approval Info */}
                    {data.approvedBy && (
                        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <User size={18} className="text-blue-600" />
                                    <span className="font-semibold text-blue-800 dark:text-blue-300">Approved By</span>
                                </div>
                                <p className="text-sm">{data.approvedBy.name}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {format(new Date(data.approvedAt), 'dd MMM yyyy, HH:mm')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
