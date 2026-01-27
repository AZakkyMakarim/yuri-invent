'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Check,
    Search,
    Loader2,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequests, confirmPurchaseRequest } from '@/app/actions/purchase';
import ConfirmPRModal from '@/components/purchase/ConfirmPRModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

export default function PurchasingConfirmationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('purchase');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedPR, setSelectedPR] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        // Fetch only PENDING_PURCHASING_APPROVAL for confirmation
        const result = await getPurchaseRequests(1, 50, search, 'PENDING_PURCHASING_APPROVAL');
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleConfirmOpen = (pr: any) => {
        setSelectedPR(pr);
        setIsConfirmModalOpen(true);
    };

    const handleConfirm = async (data: { paymentType: 'SPK' | 'NON_SPK', notes?: string }) => {
        if (!selectedPR || !user?.id) return;

        try {
            const res = await confirmPurchaseRequest(
                selectedPR.id,
                user.id,
                data.paymentType,
                selectedPR.vendorId,
                data.notes
            );

            if (res.success) {
                alert("PR Confirmed successfully.");
                setIsConfirmModalOpen(false);
                setSelectedPR(null);
                loadData();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            alert("Failed to confirm: " + error.message);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Purchasing Confirmation
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Review and confirm approved Purchase Requests.
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                        <Input
                            placeholder={t('purchasingVerification.searchPlaceholder')}
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
                                    <TableHead>{t('table.approvedBy')}</TableHead>
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
                                                <span>{t('purchasingVerification.loading')}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-(--color-text-muted)">
                                            {t('purchasingVerification.noData')}
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
                                            <TableCell className="text-xs text-(--color-text-secondary)">
                                                {pr.managerApprovedBy?.name}
                                                <div className="text-[10px] text-(--color-text-muted)">
                                                    {pr.managerApprovedAt && format(new Date(pr.managerApprovedAt), 'dd/MM/yy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(Number(pr.totalAmount))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/purchase/${pr.id}`)}
                                                        title={t('purchasingVerification.actions.viewDetails')}
                                                    >
                                                        <Eye size={18} className="text-(--color-text-secondary)" />
                                                    </Button>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleConfirmOpen(pr)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        <Check size={16} className="mr-2" />
                                                        Confirm
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

            {/* Confirm PR Modal */}
            {selectedPR && (
                <ConfirmPRModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => {
                        setIsConfirmModalOpen(false);
                        setSelectedPR(null);
                    }}
                    onConfirm={handleConfirm}
                    purchaseRequest={selectedPR}
                />
            )}
        </div>
    );
}
