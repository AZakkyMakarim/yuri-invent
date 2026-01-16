'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Calendar,
    ClipboardList,
    Plus,
    FileSpreadsheet,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import Link from 'next/link';
import { getOpnameList } from '@/app/actions/opname';

export default function StockOpnamePage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        const result = await getOpnameList(1, 20, search);
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const getStatusBadge = (status: string) => {
        let color = "bg-gray-100 text-gray-800";
        if (status === 'SCHEDULED') color = "bg-blue-100 text-blue-800";
        if (status === 'IN_PROGRESS') color = "bg-amber-100 text-amber-800";
        if (status === 'COMPLETED') color = "bg-green-100 text-green-800";
        if (status === 'CANCELLED') color = "bg-red-100 text-red-800";

        return <Badge className={color}>{status.replace(/_/g, ' ')}</Badge>;
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Stock Opname
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Manage stock audits and cycle counts
                    </p>
                </div>
                <Link href="/opname/schedule">
                    <Button>
                        <Plus size={18} className="mr-2" />
                        New Schedule
                    </Button>
                </Link>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3 border-b border-(--color-border) mb-0">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                            <Input
                                placeholder="Search Code or Notes..."
                                className="pl-9 bg-(--color-bg-secondary) border-(--color-border)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>Opname Code</TableHead>
                                    <TableHead>Scheduled Date</TableHead>
                                    <TableHead>Items Counted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>Loading data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-(--color-text-muted)">
                                            No stock opname history found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <ClipboardList size={16} className="text-(--color-text-muted)" />
                                                    {item.opnameCode}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={14} className="text-(--color-text-muted)" />
                                                    {format(new Date(item.scheduledDate), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <FileSpreadsheet size={14} className="text-(--color-text-muted)" />
                                                    <span>{item._count?.counts || 0} Items</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-sm text-(--color-text-secondary)">
                                                {item.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/opname/${item.id}`}>
                                                    <Button size="sm" variant="ghost">
                                                        <Eye size={16} className="mr-1" />
                                                        Details
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
