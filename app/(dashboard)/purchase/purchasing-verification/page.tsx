'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Eye,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequests, createPurchaseOrder, releasePayment } from '@/app/actions/purchase';
import POVerificationModal, { POVerificationData } from '@/components/purchase/POVerificationModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

export default function PurchasingVerificationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('purchase');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Modal state
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [selectedPR, setSelectedPR] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        // Step 2: Confirmation done. Ready for PO.
        // Include WAITING_PAYMENT to allow Finance Release simulation
        const checkStatuses = [
            'CONFIRMED',
            'WAITING_PAYMENT',
            'PAYMENT_RELEASED'
        ].join(',');

        const result = await getPurchaseRequests(1, 50, search, checkStatuses);
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleCreatePOOpen = (pr: any) => {
        setSelectedPR(pr);
        setIsPOModalOpen(true);
    };

    const handleSimulatePayment = async (pr: any) => {
        if (!confirm("Simulate Finance releasing payment for this Non-SPK request?")) return;
        if (!user?.id) return;

        setProcessingId(pr.id);
        try {
            const res = await releasePayment(pr.id, user.id);
            if (res.success) {
                alert("Payment released (Simulated). You can now create PO.");
                loadData();
            } else {
                alert("Failed: " + res.error);
            }
        } finally {
            setProcessingId(null);
        }
    };

    const handleVerify = async (data: POVerificationData) => {
        if (!selectedPR || !user?.id) return;

        setProcessingId(selectedPR.id);

        try {
            const result = await createPurchaseOrder(
                selectedPR.id,
                user.id,
                {
                    poDocumentPath: data.poDocumentPath,
                    shippingTrackingNumber: data.shippingTrackingNumber,
                    estimatedShippingDate: data.estimatedShippingDate,
                    notes: data.purchasingNotes
                }
            );

            if (result.success) {
                // Determine message based on result fields
                let msg = `✅ PO Created Successfully!\n\nPO Number: ${result.data?.poNumber}`;
                if (result.data?.grnNumber) {
                    msg += `\nGRN Number: ${result.data.grnNumber}\nInbound Created.`;
                }

                alert(msg);
                setIsPOModalOpen(false);
                setSelectedPR(null);
                await loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            alert(`Failed: ` + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        PO Verification
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        {t('purchasingVerification.description')}
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
                                    <TableHead>{t('table.status')}</TableHead>
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
                                            <TableCell className="text-xs font-medium">
                                                <span className={`px-2 py-1 rounded text-[10px] ${pr.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                                        pr.status === 'WAITING_PAYMENT' ? 'bg-orange-100 text-orange-800' :
                                                            pr.status === 'PAYMENT_RELEASED' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {pr.status.replace(/_/g, ' ')}
                                                </span>
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

                                                    {/* Waiting Payment (Non-SPK) */}
                                                    {pr.status === 'WAITING_PAYMENT' && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => handleSimulatePayment(pr)}
                                                            className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                                            disabled={processingId === pr.id}
                                                        >
                                                            {processingId === pr.id ? <Loader2 className="animate-spin h-4 w-4" /> : <span className="mr-1">💰</span>}
                                                            Release Pay
                                                        </Button>
                                                    )}

                                                    {/* Step 2: Create PO */}
                                                    {(pr.status === 'CONFIRMED' || pr.status === 'PAYMENT_RELEASED') && (
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleCreatePOOpen(pr)}
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                        >
                                                            <FileText size={16} className="mr-2" />
                                                            Create PO
                                                        </Button>
                                                    )}
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

            {/* PO Verification Modal (Step 2) */}
            {selectedPR && (
                <POVerificationModal
                    isOpen={isPOModalOpen}
                    onClose={() => {
                        setIsPOModalOpen(false);
                        setSelectedPR(null);
                    }}
                    onVerify={handleVerify}
                    purchaseRequest={selectedPR}
                />
            )}
        </div>
    );
}
