'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Calendar,
    AlertTriangle,
    PackageX,
    ArrowRightLeft,
    Box,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { getInboundIssues } from '@/app/actions/inbound';
import { useAuth } from '@/contexts/AuthContext';
import { ResolutionModal } from '@/components/inbound/ResolutionModal';
import { resolveInboundDiscrepancy } from '@/app/actions/inbound-resolution';
import { DiscrepancyResolution } from '@prisma/client';

export default function InboundIssuesPage() {
    const { user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        const result = await getInboundIssues(1, 100, search);
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleOpenResolve = (issue: any) => {
        setSelectedIssue(issue);
        setIsModalOpen(true);
    };

    const handleResolveSubmit = async (action: DiscrepancyResolution, notes: string) => {
        if (!selectedIssue || !user) return;

        const result = await resolveInboundDiscrepancy(selectedIssue.id, user.id, action, notes);

        if (result.success) {
            // Refresh data
            await loadData();
        } else {
            alert('Failed to resolve: ' + result.error);
        }
    };

    const getDiscrepancyBadge = (type: string, action: string) => {
        let color = "bg-gray-100 text-gray-800";
        if (type === 'SHORTAGE') color = "bg-amber-100 text-amber-800";
        if (type === 'OVERAGE') color = "bg-blue-100 text-blue-800";
        if (type === 'WRONG_ITEM' || type === 'DAMAGED') color = "bg-red-100 text-red-800";

        return (
            <div className="flex flex-col gap-1 items-start">
                <Badge className={color}>{type.replace(/_/g, ' ')}</Badge>
                {action && action !== 'PENDING' && (
                    <span className="text-xs font-medium text-(--color-text-secondary)">
                        Action: {action.replace(/_/g, ' ')}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Inbound Issues
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Track and resolve discrepancies (Shortages, Returns, Damages)
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                        <Input
                            placeholder="Search Item, GRN, or Vendor..."
                            className="pl-9 bg-(--color-bg-secondary) border-(--color-border)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-(--color-border) overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>Date / GRN</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Item Details</TableHead>
                                    <TableHead className="text-center">Qty Details</TableHead>
                                    <TableHead>Issue Status</TableHead>
                                    <TableHead className="w-[150px]">Notes</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>Loading issues...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-(--color-text-muted)">
                                            No outstanding inbound issues found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-(--color-text-primary)">
                                                        {item.inbound.grnNumber}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-(--color-text-muted)">
                                                        <Calendar size={12} />
                                                        {format(new Date(item.inbound.receiveDate), 'dd MMM yyyy')}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{item.inbound.vendor.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{item.item.sku}</span>
                                                    <span className="text-xs text-(--color-text-secondary)">{item.item.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span>Expected:</span>
                                                        <span className="font-medium">{item.expectedQuantity}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Received:</span>
                                                        <span className="font-medium">{item.receivedQuantity}</span>
                                                    </div>
                                                    {item.rejectedQuantity > 0 && (
                                                        <div className="flex justify-between text-red-600 font-bold">
                                                            <span>Rejected:</span>
                                                            <span>{item.rejectedQuantity}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getDiscrepancyBadge(item.discrepancyType, item.discrepancyAction)}
                                            </TableCell>
                                            <TableCell className="text-xs text-(--color-text-secondary)">
                                                {item.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(!item.discrepancyAction || item.discrepancyAction === 'PENDING') && (
                                                    <Button size="sm" variant="secondary" onClick={() => handleOpenResolve(item)}>
                                                        Resolve
                                                    </Button>
                                                )}
                                                {item.discrepancyAction && item.discrepancyAction !== 'PENDING' && (
                                                    <Button size="sm" variant="ghost" className="text-green-600 cursor-default hover:text-green-600 hover:bg-transparent">
                                                        <Check size={16} className="mr-1" />
                                                        Resolved
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Resolution Modal */}
            {selectedIssue && (
                <ResolutionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onResolve={handleResolveSubmit}
                    issue={selectedIssue}
                />
            )}
        </div>
    );
}
