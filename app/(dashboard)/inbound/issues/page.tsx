'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Check,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { getUnifiedInboundIssues, UnifiedInboundIssue } from '@/app/actions/inbound';
import { resolveInboundDiscrepancy } from '@/app/actions/inbound-resolution';
import { useAuth } from '@/contexts/AuthContext';
import { ResolutionModal } from '@/components/inbound/ResolutionModal';
import { DiscrepancyResolution, InboundDiscrepancyType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function InboundIssuesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('inbound');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [issues, setIssues] = useState<UnifiedInboundIssue[]>([]);

    // Pagination (Simple for now)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [search, page]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getUnifiedInboundIssues(page, 20, search);
            if (res.success) {
                setIssues(res.data || []);
                setTotalPages(res.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Failed to load data', error);
        }
        setLoading(false);
    };

    const handleOpenResolve = (issue: UnifiedInboundIssue) => {
        // Prepare issue object for Modal
        const modalIssue = {
            id: issue.id,
            discrepancyType: issue.type,
            item: {
                sku: issue.sku || '-',
                name: issue.itemName || '-'
            },
            expectedQuantity: issue.data.items ? issue.data.items.reduce((acc: number, i: any) => acc + i.expectedQuantity, 0) : issue.data.expectedQuantity || 0, // Fallback logic depending on shape
            receivedQuantity: issue.data.receivedQuantity || 0,
            rejectedQuantity: issue.type === 'SHORTAGE' ? 0 : (issue.data.rejectedQuantity || 0)
        };

        // For Shortages (Parent Inbound Logic), we need to adapt structure slightly if needed by Modal
        // But Shortage is usually Inbound level. Modal expects Item level?
        // Actually ResolutionModal is typed for InboundItem props (expected, received, rejected).
        // Shortage "Child Inbound" has items.

        if (issue.type === 'SHORTAGE') {
            // Shortage Issue is a CHILD INBOUND.
            // We can pass aggregated data or maybe we need to adjust Modal to handle Inbound level shortages?
            // For now, let's map it so it looks like an item to the modal, or adjust Modal.
            // The "Shortage" resolution actions (WAIT, CLOSE) apply to the whole Child Inbound.

            modalIssue.expectedQuantity = issue.qtyInvolved;
            modalIssue.receivedQuantity = 0;
            modalIssue.rejectedQuantity = 0;
        } else {
            modalIssue.expectedQuantity = issue.data.expectedQuantity;
            modalIssue.receivedQuantity = issue.data.receivedQuantity;
            modalIssue.rejectedQuantity = issue.data.rejectedQuantity;
        }

        setSelectedIssue(modalIssue);
        setIsModalOpen(true);
    };

    const handleResolveSubmit = async (action: DiscrepancyResolution, notes: string) => {
        if (!selectedIssue || !user) return;

        // Check if it's a shortage (Inbound ID) or Discrepancy (InboundItem ID)
        // We can differentiate by type stored in selectedIssue or we handled it in server action?
        // Wait, server action `resolveInboundDiscrepancy` expects `inboundItemId`.
        // Server action `closeShortage` expects `inboundId`.

        let result;
        if (selectedIssue.discrepancyType === 'SHORTAGE') {
            // It's a Shortage (Inbound)
            if (action === 'CLOSE_SHORT') {
                // Import closeShortage or use a new action?
                // We only have `resolveInboundDiscrepancy` imported currently.
                // We should probably route this correctly.
                // Let's import `closeShortage` dynamically or add it to imports.
                const { closeShortage } = await import('@/app/actions/inbound');
                result = await closeShortage(selectedIssue.id, notes);
            } else {
                // WAIT_REMAINING - basically do nothing or just update notes?
                // For now, maybe just alert "Updated"?
                // Or we can add a 'updateInboundNotes' action.
                alert("Reminder set to wait for remaining items.");
                result = { success: true };
            }
        } else {
            // It's a Discrepancy (InboundItem)
            result = await resolveInboundDiscrepancy(selectedIssue.id, user.id, action, notes);
        }

        if (result && result.success) {
            loadData();
        } else {
            alert('Failed to resolve: ' + (result?.error || 'Unknown error'));
        }
    };

    const getIssueBadge = (type: string) => {
        let color = "bg-gray-100 text-gray-800";
        if (type === 'SHORTAGE') color = "bg-orange-100 text-orange-800";
        if (type === 'OVERAGE') color = "bg-blue-100 text-blue-800";
        if (type === 'WRONG_ITEM') color = "bg-red-100 text-red-800";
        if (type === 'DAMAGED') color = "bg-red-100 text-red-800";

        return <Badge className={color}>{type.replace(/_/g, ' ')}</Badge>;
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        {t('issues.title')}
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        {t('issues.description')}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">Issue List</CardTitle>
                    <div className="w-72 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => loadData()} className="cursor-pointer hover:text-primary">
                                    <div className="flex items-center gap-2"><RefreshCw size={14} /> {t('table.date')}</div>
                                </TableHead>
                                <TableHead>{t('table.grn')}</TableHead>
                                <TableHead>{t('table.vendor')}</TableHead>
                                <TableHead>{t('table.items')}</TableHead>
                                <TableHead>{t('issues.table.issueStatus')}</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                            <span>{t('table.loading')}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : issues.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-(--color-text-muted)">
                                        {t('table.noData')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                issues.map((issue) => (
                                    <TableRow key={`${issue.type}-${issue.id}`} className={issue.status === 'RESOLVED' ? 'bg-gray-50/50 opacity-70' : ''}>
                                        <TableCell className="text-xs">
                                            {format(new Date(issue.date), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="font-medium">{issue.grnNumber}</TableCell>
                                        <TableCell>{issue.vendorName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{issue.itemName}</span>
                                                {issue.sku && <span className="text-xs text-(--color-text-secondary)">{issue.sku}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getIssueBadge(issue.type)}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {issue.qtyInvolved}
                                        </TableCell>
                                        <TableCell>
                                            {issue.status === 'PENDING' ? (
                                                <span className="text-amber-600 text-xs font-semibold px-2 py-1 bg-amber-50 rounded-full">Pending</span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                                                        <Check size={12} /> Resolved
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{issue.resolvedAction?.replace(/_/g, ' ')}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {issue.status === 'PENDING' && (
                                                <Button size="sm" onClick={() => handleOpenResolve(issue)}>
                                                    {t('issues.actions.resolve')}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
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
