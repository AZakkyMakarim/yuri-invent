import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getInboundById } from '@/app/actions/inbound';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ArrowLeft, User, Clock, Truck, FileText, Package, DollarSign, Calendar, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import InboundPaymentActions from '@/components/inbound/InboundPaymentActions';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function InboundDetailPage({ params }: PageProps) {
    const { id } = await params;

    const result = await getInboundById(id);

    if (!result.success || !result.data) {
        notFound();
    }

    const inbound = result.data;

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: "bg-yellow-100 text-yellow-800",
            PARTIAL: "bg-orange-100 text-orange-800",
            COMPLETED: "bg-green-100 text-green-800",
            READY_FOR_PAYMENT: "bg-blue-100 text-blue-800",
            PAID: "bg-purple-100 text-purple-800",
        };

        const labels: Record<string, string> = {
            PENDING: 'Pending',
            PARTIAL: 'Partial',
            COMPLETED: 'Completed',
            READY_FOR_PAYMENT: 'Ready for Payment',
            PAID: 'Paid'
        };

        return (
            <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
                {labels[status] || status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    const getItemStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            OPEN_ISSUE: "bg-red-100 text-red-800",
            COMPLETED: "bg-green-100 text-green-800",
            RESOLVED: "bg-blue-100 text-blue-800",
            CLOSED_SHORT: "bg-gray-100 text-gray-800"
        };
        return (
            <Badge className={`text-xs ${styles[status]}`}>
                {status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
            {/* Header Navigation */}
            <div className="flex items-center gap-4">
                <Link href="/inbound">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-(--color-text-primary)">
                        {inbound.grnNumber}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                        <Clock className="w-4 h-4" />
                        <span>Received on {format(new Date(inbound.receiveDate), 'dd MMMM yyyy')}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {getStatusBadge(inbound.status)}

                    {/* Payment Actions for SPK */}
                    {inbound.vendor?.vendorType === 'SPK' && (
                        <InboundPaymentActions
                            inboundId={inbound.id}
                            status={inbound.status}
                            vendorType={inbound.vendor.vendorType}
                        />
                    )}

                    {/* Verification Button (Only if PENDING or PARTIAL) */}
                    {(inbound.status === 'PENDING' || inbound.status === 'PARTIAL') && (
                        <Link href={`/inbound/${inbound.id}/verification`}>
                            <Button>Verify Inbound</Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {/* Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General Info */}
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4 text-(--color-primary)" />
                                General Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-(--color-text-muted) uppercase font-semibold">PO Number</p>
                                    <p className="font-medium text-(--color-text-primary)">
                                        {inbound.purchaseRequest?.poNumber || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-(--color-text-muted) uppercase font-semibold">PR Number</p>
                                    <p className="font-medium text-(--color-text-primary)">
                                        {inbound.purchaseRequest?.prNumber || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Created By</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="bg-(--color-bg-secondary) p-1 rounded-full">
                                            <User size={12} className="text-(--color-text-muted)" />
                                        </div>
                                        <span className="text-sm font-medium">{inbound.createdBy?.name || 'System'}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Verified By</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {inbound.verifiedBy ? (
                                            <>
                                                <div className="bg-green-50 p-1 rounded-full">
                                                    <User size={12} className="text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium">{inbound.verifiedBy.name}</span>
                                                <span className="text-xs text-(--color-text-muted) ml-1">
                                                    ({format(new Date(inbound.verifiedAt), 'dd/MM/yy')})
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-(--color-text-muted) italic">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vendor Info */}
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Truck className="w-4 h-4 text-(--color-primary)" />
                                Vendor Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Vendor Name</p>
                                <p className="font-medium text-lg text-(--color-text-primary)">
                                    {inbound.vendor?.name || '-'}
                                    {inbound.vendor?.vendorType === 'SPK' && (
                                        <Badge variant="info" className="ml-2 text-xs border-blue-200 text-blue-700 bg-blue-50">SPK</Badge>
                                    )}
                                </p>
                            </div>
                            {inbound.vendor?.picName && (
                                <div>
                                    <p className="text-xs text-(--color-text-muted) uppercase font-semibold">PIC Name</p>
                                    <p className="text-sm text-(--color-text-primary)">{inbound.vendor.picName}</p>
                                </div>
                            )}
                            {inbound.vendor?.phone && (
                                <div>
                                    <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Contact</p>
                                    <p className="text-sm text-(--color-text-primary)">{inbound.vendor.phone}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Proof Docs & Payment Info */}
                {(inbound.proofDocumentUrl || inbound.paymentDate) && (
                    <Card className="border-(--color-border) shadow-sm">
                        <CardContent className="py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {inbound.proofDocumentUrl && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-100">
                                        <Paperclip className="text-gray-400" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-gray-500">Proof of Delivery</p>
                                            <a href={inbound.proofDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                View Document
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {inbound.paymentDate && (
                                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded border border-purple-100">
                                        <DollarSign className="text-purple-400" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-purple-500">Payment Processed</p>
                                            <div className="text-sm font-medium text-purple-900">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(inbound.paymentAmount || 0))}
                                                <span className="text-gray-500 font-normal ml-2">on {format(new Date(inbound.paymentDate), 'dd MMM yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Items Table */}
                <Card className="border-(--color-border) shadow-sm">
                    <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="w-4 h-4 text-(--color-primary)" />
                            Inbound Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Details</TableHead>
                                    <TableHead className="text-center">Expected</TableHead>
                                    <TableHead className="text-center">Received</TableHead>
                                    <TableHead className="text-center">Accepted</TableHead>
                                    <TableHead className="text-center">Rejected</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inbound.items?.map((item: any) => (
                                    <TableRow key={item.id} className="hover:bg-(--color-bg-secondary)/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-(--color-text-primary)">{item.item.name}</span>
                                                <span className="text-xs text-(--color-text-muted) font-mono">{item.item.sku || item.item.code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium opacity-70">
                                            {item.expectedQuantity} {item.item.uom?.symbol}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {item.receivedQuantity} {item.item.uom?.symbol}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-bold px-2 py-0.5 rounded ${item.acceptedQuantity > 0 ? 'text-green-700 bg-green-50' : 'text-gray-400'}`}>
                                                {item.acceptedQuantity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.rejectedQuantity > 0 ? (
                                                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                    {item.rejectedQuantity}
                                                </span>
                                            ) : (
                                                <span className="text-(--color-text-muted)">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getItemStatusBadge(item.status)}
                                        </TableCell>
                                        <TableCell className="text-sm text-(--color-text-secondary) max-w-[200px] truncate" title={item.notes}>
                                            {item.notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {inbound.verificationNotes && (
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                            <CardTitle className="text-base font-semibold">Verification Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-sm text-(--color-text-primary)">
                                {inbound.verificationNotes}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
