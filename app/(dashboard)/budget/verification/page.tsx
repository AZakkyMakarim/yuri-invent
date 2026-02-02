'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Search, FileText, Loader2, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getRABList, approveRAB, rejectRAB } from '@/app/actions/rab';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

export default function RABVerificationPage() {
    const router = useRouter();
    const t = useTranslations('budget');
    const { user } = useAuth();
    const [rabs, setRabs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadRABs();
    }, []);

    const loadRABs = async () => {
        setIsLoading(true);
        const result = await getRABList();
        if (result.success) {
            // Filter only DRAFT (or PENDING if implemented) for verification
            // Assuming workflow: Draft -> Approved. Or Draft -> Pending -> Approved.
            // Currently only Draft implemented in Create.
            // So we show DRAFT here.
            setRabs(result.data?.filter((r: any) => r.status === 'DRAFT') || []);
        }
        setIsLoading(false);
    };

    const handleApprove = async (id: string) => {
        if (!confirm(t('verification.approveConfirm'))) return;
        if (!user?.id) return;

        const result = await approveRAB(id, user.id);
        if (result.success) {
            loadRABs();
        } else {
            alert(result.error);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm(t('verification.rejectConfirm'))) return;

        const result = await rejectRAB(id);
        if (result.success) {
            loadRABs();
        } else {
            alert(result.error);
        }
    };

    const filteredRabs = rabs.filter(rab =>
        rab.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rab.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fadeIn p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CheckCircle className="text-(--color-success)" />
                        {t('verification.title')}
                    </h1>
                    <p className="text-(--color-text-secondary)">{t('verification.description')}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={18} />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-card) focus:ring-2 focus:ring-(--color-primary) outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-(--color-bg-card) rounded-xl border border-(--color-border) overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-(--color-bg-tertiary) text-left">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">{t('table.code')}</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">{t('table.period')}</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">{t('table.totalBudget')}</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">{t('table.createdBy')}</th>
                                <th className="px-6 py-3 text-right font-semibold text-sm text-(--color-text-secondary)">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-(--color-text-secondary)">
                                        <Loader2 className="animate-spin inline-block mb-2" />
                                        <p>{t('verification.loading')}</p>
                                    </td>
                                </tr>
                            ) : filteredRabs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-(--color-text-muted)">
                                        {t('verification.noData')}
                                    </td>
                                </tr>
                            ) : (
                                filteredRabs.map((rab) => (
                                    <tr key={rab.id} className="hover:bg-(--color-bg-hover) transition-colors">
                                        <td className="px-6 py-4 font-medium">{rab.code}</td>
                                        <td className="px-6 py-4">{rab.fiscalMonth}/{rab.fiscalYear}</td>
                                        <td className="px-6 py-4 font-mono text-(--color-primary)">
                                            {formatCurrency(Number(rab.totalBudget), rab.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">{rab.createdBy?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => router.push(`/budget/${rab.id}`)}
                                                className="p-1.5 hover:bg-(--color-bg-tertiary) rounded text-(--color-text-secondary)"
                                                title={t('table.viewDetails')}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(rab.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-semibold"
                                            >
                                                <CheckCircle size={14} /> {t('verification.approve')}
                                            </button>
                                            <button
                                                onClick={() => handleReject(rab.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-semibold"
                                            >
                                                <XCircle size={14} /> {t('verification.reject')}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
