'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Check,
    X,
    Search,
    Loader2,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequests, verifyPurchaseRequest } from '@/app/actions/purchase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

export default function ManagerVerificationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('purchase');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Rejection Modal State
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        // Fetch only PENDING_MANAGER_APPROVAL
        const result = await getPurchaseRequests(1, 50, search, 'PENDING_MANAGER_APPROVAL');
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleApprove = async (id: string) => {
        if (!confirm(t('managerVerification.actions.approveConfirm'))) return;

        setProcessingId(id);
        const result = await verifyPurchaseRequest(id, 'APPROVE', user?.id || 'manager-id');

        if (result.success) {
            loadData(); // Refresh list
        } else {
            alert('Failed to approve: ' + result.error);
        }
        setProcessingId(null);
    };

    const openRejectModal = (id: string) => {
        setRejectId(id);
        setRejectNotes('');
    };

    const handleReject = async () => {
        if (!rejectId) return;
        if (!rejectNotes.trim()) {
            alert(t('managerVerification.modal.emptyReason'));
            return;
        }

        setProcessingId(rejectId);
        const result = await verifyPurchaseRequest(rejectId, 'REJECT', user?.id || 'manager-id', rejectNotes);

        if (result.success) {
            setRejectId(null);
            loadData();
        } else {
            alert('Failed to reject: ' + result.error);
        }
        setProcessingId(null);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        {t('managerVerification.title')}
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        {t('managerVerification.description')}
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                        <Input
                            placeholder={t('managerVerification.searchPlaceholder')}
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
                                    <TableHead>{t('table.prNumber')}</TableHead>
                                    <TableHead>{t('table.date')}</TableHead>
                                    <TableHead>{t('table.vendor')}</TableHead>
                                    <TableHead>{t('table.createdBy')}</TableHead>
                                    <TableHead className="text-right">{t('table.totalAmount')}</TableHead>
                                    <TableHead className="text-center">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>{t('managerVerification.loading')}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-(--color-text-muted)">
                                            {t('managerVerification.noData')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((pr) => (
                                        <TableRow key={pr.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium text-(--color-text-primary)">
                                                {pr.prNumber}
                                                {pr.notes && <div className="text-xs text-(--color-text-muted) truncate max-w-[200px]">{pr.notes}</div>}
                                            </TableCell>
                                            <TableCell>{format(new Date(pr.requestDate), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{pr.vendor?.name}</TableCell>
                                            <TableCell className="text-xs text-(--color-text-secondary)">{pr.createdBy?.name}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(Number(pr.totalAmount))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/purchase/${pr.id}`)}
                                                        title={t('managerVerification.actions.viewDetails')}
                                                    >
                                                        <Eye size={18} className="text-(--color-text-secondary)" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleApprove(pr.id)}
                                                        disabled={processingId === pr.id}
                                                        title={t('managerVerification.actions.approve')}
                                                        className="hover:bg-green-100 text-green-600 hover:text-green-700"
                                                    >
                                                        {processingId === pr.id ? <Loader2 className="animate-spin h-4 w-4" /> : <Check size={18} />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openRejectModal(pr.id)}
                                                        disabled={processingId === pr.id}
                                                        title={t('managerVerification.actions.reject')}
                                                        className="hover:bg-red-100 text-red-600 hover:text-red-700"
                                                    >
                                                        <X size={18} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={!!rejectId}
                onClose={() => setRejectId(null)}
                title={t('managerVerification.modal.title')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setRejectId(null)}>{t('managerVerification.modal.cancel')}</Button>
                        <Button
                            variant="danger"
                            onClick={handleReject}
                            disabled={!rejectNotes.trim() || !!processingId}
                        >
                            {processingId ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            {t('managerVerification.modal.confirmReject')}
                        </Button>
                    </>
                }
            >
                <div className="py-2">
                    <p className="text-sm text-(--color-text-secondary) mb-2">
                        {t('managerVerification.modal.description')}
                    </p>
                    <Textarea
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        placeholder={t('managerVerification.modal.placeholder')}
                        className="bg-(--color-bg-secondary)"
                    />
                </div>
            </Modal>
        </div>
    );
}
