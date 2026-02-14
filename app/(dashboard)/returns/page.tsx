'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Search, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { getReturns } from '@/app/actions/return';
import { formatDate } from '@/lib/utils';
import { ReturnStatus } from '@prisma/client';

export default function ReturnsPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchReturns();
    }, [page, search]);

    const fetchReturns = async () => {
        setLoading(true);
        const res = await getReturns(page, 10, search);
        if (res.success) {
            setReturns(res.data || []);
            setTotalPages(res.pagination?.totalPages || 1);
        }
        setLoading(false);
    };

    const getStatusColor = (status: ReturnStatus) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
            case 'APPROVED': return 'bg-blue-100 text-blue-800';
            case 'SENT_TO_VENDOR': return 'bg-purple-100 text-purple-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Vendor Returns
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Manage items returned to vendors
                    </p>
                </div>
                <Link href="/returns/create">
                    <Button className="shadow-lg hover:shadow-xl transition-all">
                        <Plus className="mr-2 h-4 w-4" /> New Return
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) h-4 w-4" />
                            <Input
                                placeholder="Search by code, vendor, or PR..."
                                className="pl-10 bg-(--color-bg-primary) border-(--color-border)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-(--color-border)">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-(--color-bg-secondary) text-(--color-text-secondary) font-medium">
                                <tr>
                                    <th className="px-4 py-3">Return Code</th>
                                    <th className="px-4 py-3">Vendor</th>
                                    <th className="px-4 py-3">Ref (PR)</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Items</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--color-border)">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-(--color-text-muted)">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading returns...
                                        </td>
                                    </tr>
                                ) : returns.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-(--color-text-muted)">
                                            No returns found
                                        </td>
                                    </tr>
                                ) : (
                                    returns.map((ret: any) => (
                                        <tr key={ret.id} className="hover:bg-(--color-bg-hover) transition-colors">
                                            <td className="px-4 py-3 font-medium text-(--color-text-primary)">{ret.returnCode}</td>
                                            <td className="px-4 py-3 text-(--color-text-primary)">{ret.vendor.name}</td>
                                            <td className="px-4 py-3 text-(--color-text-secondary)">{ret.purchaseRequest?.prNumber || '-'}</td>
                                            <td className="px-4 py-3 text-(--color-text-secondary)">{formatDate(ret.returnDate)}</td>
                                            <td className="px-4 py-3 text-(--color-text-primary)">{ret._count.items}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
                                                    {ret.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link href={`/returns/${ret.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        View <ArrowRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-6 gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-4 text-sm text-(--color-text-secondary)">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
