'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, FileText, Search, ArrowRight, Eye, Calendar, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { getStockAdjustments } from '@/app/actions/stock-adjustment';

export default function StockAdjustmentListPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    useEffect(() => {
        loadData();
    }, [pagination.page, search]);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getStockAdjustments(pagination.page, pagination.limit, search);
            if (result.success) {
                setData(result.data || []);
                if (result.pagination) {
                    setPagination(prev => ({ ...prev, ...result.pagination }));
                }
            }
        } catch (error) {
            console.error('Failed to load adjustments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700',
            PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
                {status}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        const colors = {
            OPNAME_RESULT: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
            DAMAGED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
            EXPIRED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
            MANUAL_WRITEOFF: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
            OTHER: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
            // Fallback
            DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
        };

        const colorClass = colors[type as keyof typeof colors] || colors.DEFAULT;

        return (
            <span className={`px-2 py-1 rounded border text-[10px] uppercase font-bold tracking-wide whitespace-nowrap ${colorClass}`}>
                {type.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stock Adjustments</h1>
                    <p className="text-gray-500">Manage manual stock corrections and write-offs</p>
                </div>
                <Link href="/stock-adjustment/create">
                    <Button variant="primary" className="flex items-center gap-2">
                        <Plus size={18} />
                        New Adjustment
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="font-semibold text-gray-500 uppercase text-xs">Adjustment History</div>
                    <form onSubmit={handleSearch} className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search code or notes..."
                            className="pl-8 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : data.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No adjustments found</h3>
                            <p className="max-w-xs mx-auto mb-6">Get started by creating a new stock adjustment.</p>
                            <Link href="/stock-adjustment/create">
                                <Button variant="secondary">Create Adjustment</Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Variance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((adj) => {
                                    const itemCount = adj._count?.adjustmentItems || 0;
                                    const firstItem = itemCount > 0 ? adj.adjustmentItems[0]?.item : adj.item;
                                    // Legacy variance or first item variance
                                    const variance = adj.qtyVariance ?? adj.adjustmentItems[0]?.qtyVariance ?? 0;
                                    const uom = firstItem?.uom?.symbol || '';

                                    return (
                                        <TableRow key={adj.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                            <TableCell className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                                {adj.adjustmentCode}
                                                {itemCount > 1 && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                                                        {itemCount} items
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{firstItem?.name || 'Unknown Item'}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {firstItem?.sku}
                                                        {itemCount > 1 && ` + ${itemCount - 1} more`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getTypeBadge(adj.adjustmentType)}</TableCell>
                                            <TableCell>
                                                {itemCount > 1 ? (
                                                    <span className="text-xs text-gray-500 italic">See details</span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variance > 0
                                                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                        : variance < 0
                                                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
                                                        }`}>
                                                        {variance > 0 ? '+' : ''}{variance} {uom}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(adj.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User size={14} className="text-gray-400" />
                                                    {adj.createdBy?.name || 'Unknown'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {format(new Date(adj.createdAt), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/stock-adjustment/${adj.id}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <ArrowRight size={16} />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {data.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
                            <div className="text-sm text-gray-500">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={pagination.page === pagination.totalPages}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
