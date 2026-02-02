'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, DollarSign, Package, User, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getRABDetails } from '@/app/actions/rab';

export default function RABDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const rabId = params.id as string;
    const backTo = searchParams.get('from') || '/budget';

    const [rab, setRab] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadRABDetail();
    }, [rabId]);

    const loadRABDetail = async () => {
        setIsLoading(true);
        setError('');

        const result = await getRABDetails(rabId);

        if (result.success) {
            setRab(result.data);
        } else {
            setError(result.error || 'Failed to load RAB details');
        }

        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="animate-fadeIn p-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
                        <p className="text-[var(--color-text-secondary)]">Loading Budget Plan...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !rab) {
        return (
            <div className="animate-fadeIn p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-700 dark:text-red-400">{error || 'RAB not found'}</p>
                    <Link href={backTo} className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
                        ← Back to {backTo.includes('verification') ? 'Verification' : 'Budget List'}
                    </Link>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'REJECTED':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div className="animate-fadeIn p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <Link
                        href={backTo}
                        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back to {backTo.includes('verification') ? 'Verification' : 'Budget List'}
                    </Link>
                    <div className="flex items-center gap-3">
                        <FileText className="text-[var(--color-primary)]" size={32} />
                        <div>
                            <h1 className="text-3xl font-bold">{rab.code}</h1>
                            <p className="text-[var(--color-text-secondary)]">Budget Plan Detail</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(rab.status)}`}>
                        {rab.status}
                    </span>
                    {rab.status === 'REJECTED' && (
                        <Link
                            href={`/budget/input?editId=${rab.id}`}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
                        >
                            <FileText size={16} />
                            Revise
                        </Link>
                    )}
                </div>
            </div>

            {/* Rejection Reason Card */}
            {rab.status === 'REJECTED' && rab.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-slideDown">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                            <ArrowLeft className="text-red-600 dark:text-red-400 rotate-180" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-800 dark:text-red-300">Rejection Reason</h3>
                            <p className="text-red-700 dark:text-red-400 mt-1">{rab.rejectionReason}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Period Card */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Period</p>
                            <p className="text-lg font-bold">{rab.fiscalMonth}/{rab.fiscalYear}</p>
                        </div>
                    </div>
                </div>

                {/* Total Budget Card */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Total Budget</p>
                            <p className="text-lg font-bold font-mono">{formatCurrency(Number(rab.totalBudget), rab.currency)}</p>
                        </div>
                    </div>
                </div>

                {/* Items Count Card */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Package className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Total Items</p>
                            <p className="text-lg font-bold">{rab.rabLines?.length || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Created By Card */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <User className="text-orange-600 dark:text-orange-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Created By</p>
                            <p className="text-sm font-semibold truncate">{rab.createdBy?.name || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items Table */}
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h2 className="text-lg font-semibold">Line Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                            <tr>
                                <th className="px-4 py-4 w-12 text-center font-bold text-xs tracking-wide">NO</th>
                                <th className="px-4 py-4 font-bold text-xs tracking-wide">ITEM NAME</th>
                                <th className="px-4 py-4 w-40 text-right font-bold text-xs tracking-wide">REQUIRED</th>
                                <th className="px-4 py-4 w-28 text-right font-bold text-xs tracking-wide">LAST STOCK</th>
                                <th className="px-4 py-4 w-36 text-right font-bold text-xs tracking-wide">REPLENISH</th>
                                <th className="px-4 py-4 w-32 text-right font-bold text-xs tracking-wide">UNIT PRICE</th>
                                <th className="px-4 py-4 w-40 text-right font-bold text-xs tracking-wide">TOTAL COST</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {rab.rabLines && rab.rabLines.length > 0 ? (
                                rab.rabLines.map((line: any, index: number) => (
                                    <tr key={line.id} className="hover:bg-[var(--color-bg-hover)] transition-all">
                                        <td className="px-4 py-3 text-center font-medium text-[var(--color-text-secondary)]">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{line.item?.name || 'N/A'}</div>
                                            {line.item?.sku && (
                                                <div className="text-xs text-[var(--color-text-muted)]">{line.item.sku}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                <span className="font-mono font-medium">
                                                    {Number(line.requiredQty).toLocaleString('id-ID')}
                                                </span>
                                                {line.item?.uom?.symbol && (
                                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                                        {line.item.uom.symbol}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--color-text-muted)] font-mono text-sm">
                                            {Number(line.lastStockSnapshot).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400 font-mono text-sm">
                                            {Number(line.replenishQty).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] font-mono text-sm">
                                            {formatCurrency(Number(line.unitPrice), rab.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-lg text-blue-600 dark:text-blue-400 font-mono">
                                            {formatCurrency(Number(line.totalAmount), rab.currency)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                                        No line items found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-[var(--color-bg-secondary)] border-t-2 border-[var(--color-border)]">
                            <tr>
                                <td colSpan={2} className="px-4 py-4 text-right font-bold tracking-wide">TOTAL</td>
                                <td className="px-4 py-4 text-right font-bold font-mono">
                                    {rab.rabLines?.reduce((sum: number, line: any) => sum + Number(line.requiredQty), 0).toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-4 text-right font-bold font-mono">
                                    {rab.rabLines?.reduce((sum: number, line: any) => sum + Number(line.lastStockSnapshot), 0).toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-4 text-right font-bold text-green-700 dark:text-green-300 font-mono">
                                    {rab.rabLines?.reduce((sum: number, line: any) => sum + Number(line.replenishQty), 0).toLocaleString('id-ID')}
                                </td>
                                <td></td>
                                <td className="px-4 py-4 text-right text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">
                                    {formatCurrency(Number(rab.totalBudget), rab.currency)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={18} className="text-[var(--color-text-secondary)]" />
                        <h3 className="font-semibold">Timeline</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[var(--color-text-secondary)]">Created:</span>
                            <span className="font-medium">{new Date(rab.createdAt).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--color-text-secondary)]">Last Updated:</span>
                            <span className="font-medium">{new Date(rab.updatedAt).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>

                {rab.status === 'APPROVED' && rab.approvedBy && (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                            <h3 className="font-semibold">Approval Info</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--color-text-secondary)]">Approved By:</span>
                                <span className="font-medium">{rab.approvedBy.name}</span>
                            </div>
                            {rab.approvedAt && (
                                <div className="flex justify-between">
                                    <span className="text-[var(--color-text-secondary)]">Approved At:</span>
                                    <span className="font-medium">{new Date(rab.approvedAt).toLocaleString('id-ID')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
