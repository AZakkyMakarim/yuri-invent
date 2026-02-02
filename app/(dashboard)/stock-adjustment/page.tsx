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
            DRAFT: 'bg-gray-100 text-gray-700',
            PENDING: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
                {status}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        return (
            <span className="px-2 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 bg-gray-50">
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
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((adj) => (
                                    <TableRow key={adj.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-mono font-medium text-blue-600">
                                            {adj.adjustmentCode}
                                        </TableCell>
                                        <TableCell>{getTypeBadge(adj.adjustmentType)}</TableCell>
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
                                ))}
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
