import { notFound } from 'next/navigation';
import { getReturnById } from '@/app/actions/return';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ArrowLeft, User, Clock, Truck, FileText, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import ResultActions from './ReturnActions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReturnStatus } from '@prisma/client';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ReturnDetailPage({ params }: PageProps) {
    const { id } = await params;

    const result = await getReturnById(id);

    if (!result.success || !result.data) {
        notFound();
    }

    const returnData = result.data;

    const getStatusBadge = (status: ReturnStatus) => {
        const styles: Record<string, string> = {
            DRAFT: "bg-gray-100 text-gray-800",
            PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
            APPROVED: "bg-green-100 text-green-800",
            REJECTED: "bg-red-100 text-red-800",
            SENT_TO_VENDOR: "bg-blue-100 text-blue-800",
            COMPLETED: "bg-purple-100 text-purple-800",
        };

        return (
            <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
                {status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
            {/* Header Navigation */}
            <div className="flex items-center gap-4">
                <Link href="/returns">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-(--color-text-primary)">
                        {returnData.returnCode}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                        <Clock className="w-4 h-4" />
                        <span>Created on {formatDate(returnData.createdAt)}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {getStatusBadge(returnData.status)}

                    <ResultActions
                        id={returnData.id}
                        status={returnData.status}
                        approvedBy={returnData.approvedBy}
                        sentToVendorAt={returnData.sentToVendorAt}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items Table */}
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Package className="w-4 h-4 text-(--color-primary)" />
                                Returned Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Details</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returnData.items?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-(--color-bg-hover)">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-(--color-text-primary)">{item.item.name}</span>
                                                    <span className="text-xs text-(--color-text-secondary) font-mono">{item.item.sku || item.item.code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {item.quantity} {item.item.uom?.symbol}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(Number(item.unitPrice))}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-(--color-text-primary)">
                                                {formatCurrency(Number(item.totalPrice))}
                                            </TableCell>
                                            <TableCell className="text-sm text-(--color-text-muted) italic">
                                                {item.reason || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    {returnData.notes && (
                        <Card className="border-(--color-border) shadow-sm">
                            <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)">
                                <CardTitle className="text-base font-semibold">Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-(--color-text-primary) whitespace-pre-wrap">
                                    {returnData.notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* General Info */}
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4 text-(--color-primary)" />
                                Return Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Reason</p>
                                <p className="font-medium text-(--color-text-primary)">
                                    {returnData.reason.replace(/_/g, ' ')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-(--color-text-muted) uppercase font-semibold">PR Number</p>
                                <p className="font-medium text-(--color-text-primary)">
                                    {returnData.purchaseRequest?.prNumber || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Created By</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="bg-(--color-bg-tertiary) p-1 rounded-full">
                                        <User size={12} className="text-(--color-text-secondary)" />
                                    </div>
                                    <span className="text-sm font-medium">{returnData.createdBy?.name || 'System'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vendor Info */}
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Truck className="w-4 h-4 text-(--color-primary)" />
                                Vendor Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Vendor Name</p>
                                <p className="font-medium text-lg text-(--color-text-primary)">
                                    {returnData.vendor?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Address</p>
                                <p className="text-sm text-(--color-text-primary)">{returnData.vendor?.address || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Approval Info */}
                    <Card className="border-(--color-border) shadow-sm">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)">
                            <CardTitle className="text-base font-semibold">Approval Status</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {returnData.status === 'PENDING_APPROVAL' ? (
                                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm dark:bg-yellow-900/30 dark:text-yellow-200">
                                    Awaiting Management Approval
                                </div>
                            ) : returnData.approvedBy ? (
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-(--color-text-muted) uppercase font-semibold">
                                            {returnData.status === 'REJECTED' ? 'Rejected By' : 'Approved By'}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="bg-(--color-bg-tertiary) p-1 rounded-full">
                                                <User size={12} className="text-(--color-text-secondary)" />
                                            </div>
                                            <span className="text-sm font-medium">{returnData.approvedBy.name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-(--color-text-muted) uppercase font-semibold">Date</p>
                                        <p className="text-sm">{formatDate(returnData.approvedAt)}</p>
                                    </div>
                                    {returnData.approvalNotes && (
                                        <div className="mt-2 p-2 bg-(--color-bg-tertiary) text-xs italic border-l-2 border-(--color-border)">
                                            "{returnData.approvalNotes}"
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-(--color-text-muted) italic">No approval data yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
