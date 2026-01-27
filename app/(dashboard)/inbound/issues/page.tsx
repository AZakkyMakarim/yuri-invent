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
    Check,
    Clock,
    XCircle,
    Truck,
    Archive
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from "@/components/ui/Tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { getInboundIssues, getPendingShortages, closeShortage } from '@/app/actions/inbound';
import { getReturns, keepReturnItems } from '@/app/actions/return';
import { useAuth } from '@/contexts/AuthContext';
import { ResolutionModal } from '@/components/inbound/ResolutionModal';
import { resolveInboundDiscrepancy } from '@/app/actions/inbound-resolution';
import { DiscrepancyResolution } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function InboundIssuesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('inbound');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('shortages');

    // Data States
    const [shortages, setShortages] = useState<any[]>([]);
    const [returns, setReturns] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    // Modal State
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [search, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'shortages') {
                const res = await getPendingShortages(1, 100, search);
                if (res.success) setShortages(res.data || []);
            } else if (activeTab === 'returns') {
                const res = await getReturns(1, 100, search, 'DRAFT'); // Only Draft returns need resolution
                if (res.success) setReturns(res.data || []);
            } else if (activeTab === 'history') {
                const res = await getInboundIssues(1, 100, search);
                if (res.success) setHistory(res.data || []);
            }
        } catch (error) {
            console.error('Failed to load data', error);
        }
        setLoading(false);
    };

    // Actions
    const handleCloseShortage = async (id: string) => {
        if (!confirm('Are you sure you want to close this shortage? This means you are NOT expecting the remaining items.')) return;

        const result = await closeShortage(id, 'Closed by user in Resolution Center');
        if (result.success) {
            loadData();
        } else {
            alert('Failed: ' + result.error);
        }
    };

    const handleKeepReturn = async (id: string) => {
        if (!confirm('Are you sure you want to KEEP these items? This will add them to stock and complete the return.')) return;

        const result = await keepReturnItems(id, 'Kept by user decision');
        if (result.success) {
            loadData();
        } else {
            alert('Failed: ' + result.error);
        }
    };

    const handleProcessReturn = (id: string) => {
        router.push(`/returns/${id}`);
    };

    // Discrepancy History Actions
    const handleOpenResolve = (issue: any) => {
        setSelectedIssue(issue);
        setIsModalOpen(true);
    };

    const handleResolveSubmit = async (action: DiscrepancyResolution, notes: string) => {
        if (!selectedIssue || !user) return;
        const result = await resolveInboundDiscrepancy(selectedIssue.id, user.id, action, notes);
        if (result.success) {
            loadData();
        } else {
            alert('Failed to resolve: ' + result.error);
        }
    };

    const getDiscrepancyBadge = (type: string, action: string) => {
        let color = "bg-gray-100 text-gray-800";
        if (type === 'SHORTAGE') color = "bg-orange-100 text-orange-800";
        if (type === 'OVERAGE') color = "bg-blue-100 text-blue-800";
        if (type === 'WRONG_ITEM' || type === 'DAMAGED') color = "bg-red-100 text-red-800";

        return (
            <div className="flex flex-col gap-1 items-start">
                <Badge className={color}>{type.replace(/_/g, ' ')}</Badge>
                {action && action !== 'PENDING' && (
                    <span className="text-xs font-medium text-(--color-text-secondary)">
                        {t('issues.actions.resolved')}
                    </span>
                )}
            </div>
        );
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

            <div className="flex justify-end mb-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        className="pl-9 bg-(--color-bg-secondary) border-(--color-border)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Tabs
                tabs={[
                    { id: 'shortages', label: t('issues.tabs.shortages'), icon: <Clock size={16} /> },
                    { id: 'returns', label: t('issues.tabs.returns'), icon: <ArrowRightLeft size={16} /> },
                    { id: 'history', label: t('issues.tabs.history'), icon: <Archive size={16} /> }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="w-full"
            >
                {(tab) => (
                    <>
                        {/* --- SHORTAGES TAB --- */}
                        {tab === 'shortages' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('issues.tabs.shortages')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('issues.table.childGrn')}</TableHead>
                                                <TableHead>{t('issues.table.parentGrn')}</TableHead>
                                                <TableHead>{t('table.vendor')}</TableHead>
                                                <TableHead>{t('table.status')}</TableHead>
                                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {shortages.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-(--color-text-muted)">
                                                        {t('table.noData')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                shortages.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">{item.grnNumber}</TableCell>
                                                        <TableCell>{item.parentInbound?.grnNumber || '-'}</TableCell>
                                                        <TableCell>{item.vendor?.name}</TableCell>
                                                        <TableCell><Badge variant="warning">{t('pendingVerification')}</Badge></TableCell>
                                                        <TableCell className="text-right flex justify-end gap-2">
                                                            <Button size="sm" variant="secondary" onClick={() => router.push('/inbound')}>
                                                                {t('issues.actions.wait')}
                                                            </Button>
                                                            <Button size="sm" variant="danger" onClick={() => handleCloseShortage(item.id)}>
                                                                {t('issues.actions.closeShort')}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* --- RETURNS TAB --- */}
                        {tab === 'returns' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('issues.tabs.returns')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('issues.table.returnId')}</TableHead>
                                                <TableHead>{t('issues.table.parentGrn')} (PR)</TableHead>
                                                <TableHead>{t('table.vendor')}</TableHead>
                                                <TableHead>{t('issues.table.reason')}</TableHead>
                                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {returns.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-(--color-text-muted)">
                                                        {t('table.noData')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                returns.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">{item.returnCode}</TableCell>
                                                        <TableCell>{item.purchaseRequest?.prNumber}</TableCell>
                                                        <TableCell>{item.vendor?.name}</TableCell>
                                                        <TableCell>{item.reason}</TableCell>
                                                        <TableCell className="text-right flex justify-end gap-2">
                                                            <Button size="sm" onClick={() => handleProcessReturn(item.id)}>
                                                                {t('issues.actions.processReturn')}
                                                            </Button>
                                                            <Button size="sm" variant="secondary" onClick={() => handleKeepReturn(item.id)}>
                                                                {t('issues.actions.keepItems')}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* --- HISTORY TAB --- */}
                        {tab === 'history' && (
                            <Card>
                                <CardContent className="pt-6">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('table.date')} / {t('table.grn')}</TableHead>
                                                <TableHead>{t('table.vendor')}</TableHead>
                                                <TableHead>{t('table.items')}</TableHead>
                                                <TableHead className="text-center">{t('verification.table.status')}</TableHead>
                                                <TableHead>{t('issues.table.issueStatus')}</TableHead>
                                                <TableHead className="w-[150px]">{t('issues.table.notes')}</TableHead>
                                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                            <span>{t('table.loading')}</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : history.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-(--color-text-muted)">
                                                        {t('table.noData')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                history.map((item) => (
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
                                                            <div className="text-xs text-center">
                                                                Exp: {item.expectedQuantity} / Rec: {item.receivedQuantity}
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
                                                                    {t('issues.actions.resolve')}
                                                                </Button>
                                                            )}
                                                            {item.discrepancyAction && item.discrepancyAction !== 'PENDING' && (
                                                                <Button size="sm" variant="ghost" className="text-green-600 cursor-default hover:text-green-600 hover:bg-transparent">
                                                                    <Check size={16} className="mr-1" />
                                                                    {t('issues.actions.resolved')}
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
                        )}
                    </>
                )}
            </Tabs>

            {/* Resolution Modal (For History Tab) */}
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
