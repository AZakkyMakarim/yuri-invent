'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, Search, ArrowRight, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { getStockAdjustments } from '@/app/actions/stock-adjustment';
import { ApprovalStatus } from '@prisma/client';

export default function StockAdjustmentVerificationPage() {
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
            // Force status=PENDING
            const result = await getStockAdjustments(pagination.page, pagination.limit, search, ApprovalStatus.PENDING);
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
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const getTypeBadge = (type: string) => {
        return (
            <span className="px-2 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 bg-gray-50 uppercase">
                {type.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Verifikasi Penyesuaian</h1>
                <p className="text-gray-500">Review and approve stock correction requests</p>
            </div>

            <Card className="border-l-4 border-l-yellow-400">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-yellow-50/50">
                    <div className="flex items-center gap-2 font-semibold text-yellow-700">
                        <CheckCircle size={16} />
                        PENDING APPROVALS ({pagination.total})
                    </div>
                    <form onSubmit={handleSearch} className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search pending requests..."
                            className="pl-8 h-9 bg-white"
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
                            <CheckCircle size={48} className="mb-4 opacity-20 text-green-500" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
                            <p className="max-w-xs mx-auto text-sm">No pending adjustments require your attention.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Requested Date</TableHead>
                                    <TableHead className="text-right">Items</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((adj) => (
                                    <TableRow key={adj.id} className="hover:bg-yellow-50/30 transition-colors">
                                        <TableCell className="font-mono font-bold text-gray-900">
                                            {adj.adjustmentCode}
                                        </TableCell>
                                        <TableCell>{getTypeBadge(adj.adjustmentType)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <User size={14} className="text-gray-400" />
                                                <span className="font-medium">{adj.createdBy?.name || 'Unknown'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {format(new Date(adj.createdAt), 'dd MMM yyyy, HH:mm')}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {adj._count?.items || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/stock-adjustment/${adj.id}`}>
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                                    Review
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
