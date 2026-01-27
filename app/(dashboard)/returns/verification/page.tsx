'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Search, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { getReturns } from '@/app/actions/return'; // We'll need to support filtering by status in getReturns if not already
import { formatDate } from '@/lib/utils'; // Make sure this is imported

export default function ReturnVerificationPage() {
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
        // Note: I need to update getReturns to support status filtering or do it client side?
        // Let's check getReturns implementation. 
        // Logic: getReturns(page, limit, search) currently doesn't support generic status filter param?
        // Wait, looking at Step 125, getReturns does NOT accept status.
        // It accepts (page = 1, limit = 10, search = '').
        // So I need to update getReturns to accept status!

        // For now, I will fetch all and filter client side? No, bad for pagination.
        // I MUST update getReturns.
        // But for this step, I'll write the component assuming I'll fix the action next.
        const res = await getReturns(page, 10, search, 'PENDING_APPROVAL');
        if (res.success) {
            setReturns(res.data || []);
            // Pagination will be broken if I filter client side on paginated result.
            // I WILL UPDATE THE ACTION.
            setTotalPages(res.pagination?.totalPages || 1);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                    Return Verification
                </h1>
                <p className="text-(--color-text-secondary)">
                    Approve or reject pending vendor returns
                </p>
            </div>

            <Card>
                <CardContent className="p-6">
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
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </td>
                                    </tr>
                                ) : returns.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            No pending returns found
                                        </td>
                                    </tr>
                                ) : (
                                    returns.map((ret: any) => (
                                        <tr key={ret.id} className="hover:bg-(--color-bg-hover) transition-colors">
                                            <td className="px-4 py-3 font-medium">{ret.returnCode}</td>
                                            <td className="px-4 py-3">{ret.vendor.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{ret.purchaseRequest?.prNumber || '-'}</td>
                                            <td className="px-4 py-3">{formatDate(ret.returnDate)}</td>
                                            <td className="px-4 py-3">{ret._count.items}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Pending Approval
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link href={`/returns/${ret.id}`}>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                        Verify <ArrowRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
