import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, User, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface PageProps {
    params: { id: string }
}

export default async function PRDetailPage({ params }: PageProps) {
    const { id } = params;

    const pr = await prisma.purchaseRequest.findUnique({
        where: { id },
        include: {
            vendor: true,
            createdBy: { select: { name: true, email: true } },
            managerApprovedBy: { select: { name: true } },
            purchasingAcceptedBy: { select: { name: true } },
            items: {
                include: {
                    item: {
                        include: { uom: true }
                    }
                }
            },
            rab: { select: { code: true, name: true } }
        }
    });

    if (!pr) notFound();

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: "bg-gray-100 text-gray-800",
            PENDING_MANAGER_APPROVAL: "bg-yellow-100 text-yellow-800",
            PENDING_PURCHASING_APPROVAL: "bg-orange-100 text-orange-800",
            APPROVED: "bg-green-100 text-green-800",
            REJECTED: "bg-red-100 text-red-800",
            CANCELLED: "bg-gray-200 text-gray-600",
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
                <Link href="/purchase">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-(--color-text-primary)">
                        {pr.prNumber}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                        <Clock className="w-4 h-4" />
                        <span>Requested on {format(new Date(pr.requestDate), 'dd MMMM yyyy')}</span>
                    </div>
                </div>
                <div className="ml-auto">
                    {getStatusBadge(pr.status)}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content (2 cols) */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items Table */}
                    <Card className="border-(--color-border) shadow-xs">
                        <CardHeader>
                            <CardTitle>Request Items</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-(--color-bg-secondary)">
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-center">UOM</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pr.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium text-(--color-text-primary)">{item.item.name}</div>
                                                <div className="text-xs text-(--color-text-muted)">{item.item.sku}</div>
                                                {item.notes && <div className="text-xs italic text-(--color-text-muted) mt-1">{item.notes}</div>}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-center text-(--color-text-secondary)">{item.item.uom.symbol}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap text-(--color-text-secondary)">{formatCurrency(Number(item.unitPrice))}</TableCell>
                                            <TableCell className="text-right font-medium text-(--color-text-primary) whitespace-nowrap">{formatCurrency(Number(item.totalPrice))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="p-4 bg-(--color-bg-secondary)/50 flex justify-end items-center border-t border-(--color-border)">
                                <span className="font-bold text-lg mr-4 text-(--color-text-secondary)">Total Amount:</span>
                                <span className="font-bold text-xl text-(--color-text-primary)">{formatCurrency(Number(pr.totalAmount))}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Description */}
                    {pr.notes && (
                        <Card className="border-(--color-border) bg-(--color-bg-secondary)/30">
                            <CardHeader className="py-3">
                                <CardTitle className="text-base">Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3 text-(--color-text-secondary)">
                                {pr.notes}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar (1 col) */}
                <div className="space-y-6">
                    {/* Vendor Info */}
                    <Card className="border-(--color-border)">
                        <CardHeader>
                            <CardTitle className="text-base">Vendor Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="font-medium">{pr.vendor.name}</div>
                            <div className="text-sm text-(--color-text-secondary)">
                                <p>{pr.vendor.address || 'No address'}</p>
                                <p>{pr.vendor.phone || 'No phone'}</p>
                            </div>
                            {pr.rab && (
                                <div className="pt-3 border-t border-(--color-border)">
                                    <div className="text-xs text-(--color-text-muted) uppercase font-bold mb-1">Linked RAB</div>
                                    <Link href={`/budget/${pr.rabId}`} className="text-sm text-(--color-primary) hover:underline">
                                        {pr.rab.code} - {pr.rab.name}
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="border-(--color-border)">
                        <CardHeader>
                            <CardTitle className="text-base">Approval Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Created */}
                            <div className="flex gap-3 relative pb-4 border-l-2 border-green-200 ml-2 pl-4">
                                <div className="absolute -left-[9px] top-0 bg-white dark:bg-gray-900 rounded-full text-green-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Request Created</div>
                                    <div className="text-xs text-(--color-text-secondary)">by {pr.createdBy.name}</div>
                                    <div className="text-xs text-(--color-text-muted)">{format(new Date(pr.createdAt), 'dd MMM yyyy HH:mm')}</div>
                                </div>
                            </div>

                            {/* Manager Approval */}
                            <div className={`flex gap-3 relative pb-4 border-l-2 ml-2 pl-4 ${pr.managerApprovedBy ? 'border-green-200' : 'border-gray-200'}`}>
                                <div className={`absolute -left-[9px] top-0 bg-white dark:bg-gray-900 rounded-full ${params ? '' : ''}`}>
                                    {pr.managerApprovedBy ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-300" />}
                                    {pr.managerApprovalStatus === 'REJECTED' && <XCircle className="w-4 h-4 text-red-500" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">
                                        {pr.managerApprovalStatus === 'REJECTED' ? 'Manager Rejected' : 'Manager Approval'}
                                    </div>
                                    {pr.managerApprovedBy ? (
                                        <>
                                            <div className="text-xs text-(--color-text-secondary)">by {pr.managerApprovedBy.name}</div>
                                            <div className="text-xs text-(--color-text-muted)">{pr.managerApprovedAt ? format(new Date(pr.managerApprovedAt), 'dd MMM yyyy') : ''}</div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-(--color-text-muted)">Pending</div>
                                    )}
                                    {pr.managerNotes && (
                                        <div className="text-xs italic bg-red-50 text-red-800 p-2 mt-1 rounded-sm border border-red-100">
                                            "{pr.managerNotes}"
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Purchasing Acceptance */}
                            <div className="flex gap-3 relative ml-2 pl-4">
                                <div className="absolute -left-[9px] top-0 bg-white dark:bg-gray-900 rounded-full">
                                    {pr.purchasingAcceptedBy ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-300" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Purchasing Verification</div>
                                    {pr.purchasingAcceptedBy ? (
                                        <>
                                            <div className="text-xs text-(--color-text-secondary)">by {pr.purchasingAcceptedBy.name}</div>
                                            <div className="text-xs text-(--color-text-muted)">{pr.purchasingAcceptedAt ? format(new Date(pr.purchasingAcceptedAt), 'dd MMM yyyy') : ''}</div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-(--color-text-muted)">
                                            {pr.status === 'APPROVED' ? 'Pending PO Creation' : 'Waiting for Approval'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
