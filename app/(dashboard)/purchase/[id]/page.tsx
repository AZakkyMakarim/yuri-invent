import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, User, Clock, CheckCircle2, XCircle, AlertTriangle, FileText, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function PRDetailPage({ params }: PageProps) {
    const { id } = await params;

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
                        include: {
                            uom: true,
                            category: true
                        }
                    }
                }
            },
            rab: { select: { code: true, name: true } },
            targetWarehouse: true
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

            <div className="space-y-6">
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN: Transaction Details (2/3 Width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Consolidated Transaction Info Card */}
                        <Card className="border-(--color-border) shadow-sm">
                            <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-(--color-primary)" />
                                    Transaction Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Vendor Section */}
                                    <div className="flex flex-col gap-3 h-full">
                                        <div className="text-xs font-bold uppercase text-(--color-text-muted) tracking-wider flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            Vendor Information
                                        </div>
                                        <div className="bg-(--color-bg-secondary)/30 p-3 rounded-md border border-(--color-border)/50 flex-1">
                                            <div className="font-semibold text-(--color-text-primary) text-lg mb-1">{pr.vendor.name}</div>
                                            <div className="text-sm text-(--color-text-secondary) space-y-0.5">
                                                <p className="flex items-start gap-2">
                                                    <span className="opacity-70 min-w-[60px]">Address:</span>
                                                    <span>{pr.vendor.address || '-'}</span>
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <span className="opacity-70 min-w-[60px]">Phone:</span>
                                                    <span>{pr.vendor.phone || '-'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        {pr.rab && (
                                            <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md border border-blue-100 dark:border-blue-800/30">
                                                <span className="font-medium">Linked RAB:</span>
                                                <Link href={`/budget/${pr.rabId}`} className="hover:underline truncate font-mono" title={`${pr.rab.code} - ${pr.rab.name}`}>
                                                    {pr.rab.code}
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Destination Section */}
                                    <div className="flex flex-col gap-3 h-full">
                                        <div className="text-xs font-bold uppercase text-(--color-text-muted) tracking-wider flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                            Destination
                                        </div>
                                        <div className="bg-(--color-bg-secondary)/30 p-3 rounded-md border border-(--color-border)/50 flex-1">
                                            {(pr as any).targetWarehouse ? (
                                                <div className="flex flex-col h-full justify-center">
                                                    <div className="font-semibold text-(--color-text-primary) text-lg mb-1">{(pr as any).targetWarehouse.name}</div>
                                                    <div className="text-sm text-(--color-text-secondary)">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-(--color-bg-secondary) border border-(--color-border) mb-2">
                                                            {(pr as any).targetWarehouse.type === 'MAIN' ? 'Main Warehouse' : 'Branch Warehouse'}
                                                        </span>
                                                        <p className="opacity-80">{(pr as any).targetWarehouse.address || 'No address details'}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-(--color-text-secondary) italic flex items-center h-full">
                                                    <div className="border-l-2 border-orange-300 pl-3">
                                                        No specific warehouse assigned. Incoming goods routed to Main Warehouse.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Section - Full Width */}
                                {pr.notes && (
                                    <>
                                        <div className="h-px bg-(--color-border) w-full"></div>
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold uppercase text-(--color-text-muted) tracking-wider">Notes</div>
                                            <div className="text-sm text-(--color-text-secondary) bg-(--color-bg-secondary)/50 p-3 rounded border border-(--color-border) italic">
                                                "{pr.notes}"
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Justification Block (Conditional) */}
                        {pr.requiresJustification && (
                            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 overflow-hidden">
                                <div className="bg-orange-100 dark:bg-orange-900/30 px-4 py-3 border-b border-orange-200 dark:border-orange-800 flex items-center gap-2 text-orange-800 dark:text-orange-200">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <span className="font-semibold">Budget Variance Justification Needed</span>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                    <div className="text-sm text-orange-700 dark:text-orange-300">
                                        ⚠️ This PR contains items that exceed the RAB budget or are not included in the RAB.
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wide">Reason Provided:</div>
                                        <div className="text-sm text-(--color-text-primary) bg-white dark:bg-gray-900/50 p-3 rounded border border-orange-200 dark:border-orange-800/50">
                                            {pr.justificationReason || 'No reason provided.'}
                                        </div>
                                    </div>
                                    {pr.justificationDocument && (
                                        <div className="pt-2">
                                            <a
                                                href={pr.justificationDocument}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                <FileText className="w-4 h-4" />
                                                View Supporting Document
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Approval Status Sidebar (1/3 Width) */}
                    <div className="lg:col-span-1">
                        <Card className="border-(--color-border) shadow-sm h-full max-h-[600px] overflow-y-auto sticky top-6">
                            <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                                <CardTitle className="text-base font-semibold">Approval Status</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-6">
                                {/* Request Created */}
                                <div className="flex gap-4 relative">
                                    <div className="absolute left-[7px] top-8 bottom-[-24px] w-0.5 bg-green-200 dark:bg-green-900"></div>
                                    <div className="relative z-10 shrink-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white dark:ring-gray-950 mt-1.5 flex items-center justify-center">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-(--color-text-primary)">Request Created</div>
                                        <div className="text-xs text-(--color-text-muted) mt-0.5">
                                            {format(new Date(pr.createdAt), 'dd MMM yyyy, HH:mm')}
                                        </div>
                                        <div className="text-xs text-(--color-text-secondary) mt-1 bg-(--color-bg-secondary) px-2 py-0.5 rounded inline-block">
                                            by {pr.createdBy.name}
                                        </div>
                                    </div>
                                </div>

                                {/* Manager Approval */}
                                <div className="flex gap-4 relative">
                                    <div className={`absolute left-[7px] top-8 bottom-[-24px] w-0.5 ${pr.managerApprovedBy ? 'bg-green-200 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                                    <div className={`relative z-10 shrink-0 w-4 h-4 rounded-full ring-4 ring-white dark:ring-gray-950 mt-1.5 flex items-center justify-center ${pr.managerApprovedBy
                                        ? 'bg-green-500'
                                        : pr.managerApprovalStatus === 'REJECTED'
                                            ? 'bg-red-500'
                                            : 'bg-gray-300 dark:bg-gray-700'
                                        }`}>
                                        {pr.managerApprovedBy ? (
                                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                        ) : pr.managerApprovalStatus === 'REJECTED' ? (
                                            <XCircle className="w-2.5 h-2.5 text-white" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-(--color-text-primary)">
                                            {pr.managerApprovalStatus === 'REJECTED' ? 'Manager Rejected' : 'Manager Approval'}
                                        </div>
                                        {pr.managerApprovedBy ? (
                                            <>
                                                <div className="text-xs text-(--color-text-muted) mt-0.5">
                                                    {pr.managerApprovedAt && format(new Date(pr.managerApprovedAt), 'dd MMM yyyy, HH:mm')}
                                                </div>
                                                <div className="text-xs text-(--color-text-secondary) mt-1 bg-(--color-bg-secondary) px-2 py-0.5 rounded inline-block">
                                                    by {pr.managerApprovedBy.name}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-(--color-text-muted) italic mt-1">Pending approval...</div>
                                        )}
                                        {pr.managerNotes && (
                                            <div className="text-xs italic bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-2 mt-2 rounded border border-red-100 dark:border-red-800/30">
                                                "{pr.managerNotes}"
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Purchasing Verification */}
                                <div className="flex gap-4 relative">
                                    <div className={`relative z-10 shrink-0 w-4 h-4 rounded-full ring-4 ring-white dark:ring-gray-950 mt-1.5 flex items-center justify-center ${pr.purchasingAcceptedBy ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                                        }`}>
                                        {pr.purchasingAcceptedBy ? (
                                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-(--color-text-primary)">Purchasing Verification</div>
                                        {pr.purchasingAcceptedBy ? (
                                            <>
                                                <div className="text-xs text-(--color-text-muted) mt-0.5">
                                                    {pr.purchasingAcceptedAt && format(new Date(pr.purchasingAcceptedAt), 'dd MMM yyyy, HH:mm')}
                                                </div>
                                                <div className="text-xs text-(--color-text-secondary) mt-1 bg-(--color-bg-secondary) px-2 py-0.5 rounded inline-block">
                                                    by {pr.purchasingAcceptedBy.name}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-(--color-text-muted) italic mt-1">
                                                {pr.status === 'APPROVED' ? 'Pending PO Creation' : 'Waiting for previous steps'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>

                {/* Items Table (Full Width) */}
                <Card className="border-(--color-border) shadow-xs overflow-hidden">
                    <CardHeader>
                        <CardTitle>Request Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[2400px] border-collapse">
                                <TableHeader className="bg-(--color-bg-secondary)">
                                    <TableRow>
                                        <TableHead rowSpan={2} className="w-12 text-center border-r border-(--color-border)">No</TableHead>
                                        <TableHead colSpan={5} className="text-center border-r border-l border-(--color-border) h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80">Item Details</TableHead>
                                        <TableHead colSpan={4} className="text-center border-r border-(--color-border) h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80">Specifications</TableHead>
                                        <TableHead colSpan={3} className="text-center border-r border-(--color-border) h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80">Logistics</TableHead>
                                        <TableHead colSpan={4} className="text-center h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80">Transaction</TableHead>
                                    </TableRow>
                                    <TableRow>
                                        {/* Item Details */}
                                        <TableHead className="w-[60px] text-center border-r border-l border-(--color-border) text-xs">Image</TableHead>
                                        <TableHead className="min-w-[250px] border-r border-(--color-border) text-xs">Item Name</TableHead>
                                        <TableHead className="min-w-[120px] border-r border-(--color-border) text-xs">SKU</TableHead>
                                        <TableHead className="min-w-[120px] border-r border-(--color-border) text-xs">Barcode</TableHead>
                                        <TableHead className="min-w-[200px] border-r border-(--color-border) text-xs">Notes</TableHead>
                                        {/* Specifications */}
                                        <TableHead className="min-w-[150px] border-r border-(--color-border) text-xs">Category</TableHead>
                                        <TableHead className="min-w-[120px] border-r border-(--color-border) text-xs">Brand</TableHead>
                                        <TableHead className="min-w-[120px] border-r border-(--color-border) text-xs">Type</TableHead>
                                        <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">Color</TableHead>
                                        {/* Logistics */}
                                        <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">Movement</TableHead>
                                        <TableHead className="min-w-[80px] border-r border-(--color-border) text-xs">Weight</TableHead>
                                        <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">Dimensions</TableHead>
                                        {/* Transaction */}
                                        <TableHead className="text-right min-w-[80px] text-xs">Qty</TableHead>
                                        <TableHead className="text-center min-w-[60px] text-xs">UOM</TableHead>
                                        <TableHead className="text-right min-w-[120px] text-xs">Unit Price</TableHead>
                                        <TableHead className="text-right min-w-[150px] text-xs">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pr.items.map((item, index) => (
                                        <TableRow key={item.id} className="hover:bg-(--color-bg-secondary)/10">
                                            <TableCell className="text-center align-top font-medium text-(--color-text-muted) border-r border-(--color-border)">
                                                {index + 1}
                                            </TableCell>

                                            {/* Item Details Columns */}
                                            <TableCell className="align-top border-r border-l border-(--color-border) p-2">
                                                <div className="h-10 w-10 border rounded bg-white flex items-center justify-center overflow-hidden mx-auto">
                                                    {item.item.imagePath ? (
                                                        <img src={item.item.imagePath} alt={item.item.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="h-4 w-4 text-gray-300" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) font-medium text-white">
                                                {item.item.name}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary) font-mono">
                                                {item.item.sku}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                                {item.item.barcode || '-'}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm">
                                                {item.notes ? (
                                                    <span className="italic text-(--color-text-muted)">{item.notes}</span>
                                                ) : (
                                                    <span className="text-(--color-text-muted/50)">-</span>
                                                )}
                                            </TableCell>

                                            {/* Specifications */}
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-white">
                                                {(item.item as any).category?.name || '-'}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-white">
                                                {(item.item as any).brand || '-'}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-white">
                                                {(item.item as any).type || '-'}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-white">
                                                {(item.item as any).color || '-'}
                                            </TableCell>
                                            {/* Logistics */}
                                            <TableCell className="align-top border-r border-(--color-border)">
                                                {(item.item as any).movementType ? (
                                                    <Badge variant="neutral" className="text-[10px] h-5 px-1.5 font-normal">
                                                        {(item.item as any).movementType}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-white">
                                                {(item.item as any).weight ? `${(item.item as any).weight} g` : '-'}
                                            </TableCell>
                                            <TableCell className="align-top border-r border-(--color-border) text-sm text-white">
                                                {((item.item as any).length || (item.item as any).width || (item.item as any).height) ?
                                                    `${(item.item as any).length || 0}x${(item.item as any).width || 0}x${(item.item as any).height || 0} cm` : '-'
                                                }
                                            </TableCell>
                                            {/* Transaction */}
                                            <TableCell className="text-right align-top font-medium text-white">{item.quantity}</TableCell>
                                            <TableCell className="text-center align-top text-sm text-(--color-text-secondary)">{item.item.uom.symbol}</TableCell>
                                            <TableCell className="text-right align-top text-sm whitespace-nowrap text-(--color-text-secondary)">{formatCurrency(Number(item.unitPrice))}</TableCell>
                                            <TableCell className="text-right align-top font-medium text-white whitespace-nowrap">{formatCurrency(Number(item.totalPrice))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="p-4 bg-(--color-bg-secondary)/50 flex justify-end items-center border-t border-(--color-border)">
                            <span className="font-bold text-lg mr-4 text-(--color-text-secondary)">Total Amount:</span>
                            <span className="font-bold text-xl text-(--color-text-primary)">{formatCurrency(Number(pr.totalAmount))}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
