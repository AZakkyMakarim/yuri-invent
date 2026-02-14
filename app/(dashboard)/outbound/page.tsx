'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Calendar,
    PackageMinus,
    Plus,
    Users,
    FileText,
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
import { getOutboundList } from '@/app/actions/outbound';

export default function OutboundPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        const result = await getOutboundList(1, 20, search);
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
            APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
            RELEASED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
        };
        const colorClass = styles[status as keyof typeof styles] || styles.DRAFT;

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Outbound Requests
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Manage outgoing stock and distribution
                    </p>
                </div>
                <Link href="/outbound/create">
                    <Button>
                        <Plus size={18} className="mr-2" />
                        Create Outbound
                    </Button>
                </Link>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3 border-b border-(--color-border) mb-0">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                            <Input
                                placeholder="Search Code, Partner, or Purpose..."
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
                                    <TableHead>Outbound Code</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Purpose</TableHead>
                                    <TableHead>Lines</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>Loading data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-(--color-text-muted)">
                                            No outbound requests found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <PackageMinus size={16} className="text-(--color-text-muted)" />
                                                    {item.outboundCode}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={14} className="text-(--color-text-muted)" />
                                                    {format(new Date(item.requestDate), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="neutral" className="text-xs font-normal border border-gray-200 bg-transparent text-gray-600">
                                                    {item.type?.replace('_', ' ') || 'INTERNAL'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-(--color-text-muted)" />
                                                    <span className="font-medium">{item.partner?.name || 'Internal / Self'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate">
                                                {item.purpose || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <FileText size={14} />
                                                    <span>{item._count?.items || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/outbound/${item.id}`}>
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
