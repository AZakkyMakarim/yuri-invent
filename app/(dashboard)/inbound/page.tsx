'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Eye,
    PackageCheck,
    Calendar,
    Truck
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
import { getInbounds } from '@/app/actions/inbound';
import { useTranslations } from 'next-intl';

export default function InboundListPage() {
    const router = useRouter();
    const t = useTranslations('inbound');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadData();
    }, [search, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        const result = await getInbounds(1, 50, search, statusFilter);
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: "bg-yellow-100 text-yellow-800",
            PARTIAL: "bg-orange-100 text-orange-800",
            COMPLETED: "bg-green-100 text-green-800",
            READY_FOR_PAYMENT: "bg-blue-100 text-blue-800",
            PAID: "bg-purple-100 text-purple-800",
        };

        const labels: Record<string, string> = {
            PENDING: 'Pending',
            PARTIAL: 'Partial',
            COMPLETED: 'Completed',
            READY_FOR_PAYMENT: 'Ready for Payment',
            PAID: 'Paid'
        };

        return (
            <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
                {labels[status] || status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        {t('title')}
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        {t('description')}
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                            <Input
                                placeholder={t('searchPlaceholder')}
                                className="pl-9 bg-(--color-bg-secondary) border-(--color-border)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="h-10 px-3 rounded-md border border-(--color-border) bg-(--color-bg-secondary) text-sm focus:outline-hidden focus:ring-2 focus:ring-(--color-primary)"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">{t('allStatus')}</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIAL">Partial</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="READY_FOR_PAYMENT">Ready for Payment</option>
                                <option value="PAID">Paid</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-(--color-border) overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>{t('table.grn')}</TableHead>
                                    <TableHead>{t('table.date')}</TableHead>
                                    <TableHead>{t('table.po')}</TableHead>
                                    <TableHead>{t('table.vendor')}</TableHead>
                                    <TableHead className="text-center">{t('table.items')}</TableHead>
                                    <TableHead className="text-center">{t('table.status')}</TableHead>
                                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>{t('table.loading')}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-(--color-text-muted)">
                                            {t('table.noData')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((inbound) => (
                                        <TableRow key={inbound.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium text-(--color-text-primary)">
                                                {inbound.grnNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-(--color-text-muted)" />
                                                    {format(new Date(inbound.receiveDate), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium">{inbound.purchaseRequest?.poNumber || '-'}</span>
                                                    <span className="text-xs text-(--color-text-muted)">{inbound.purchaseRequest?.prNumber}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Truck size={14} className="text-(--color-text-muted)" />
                                                    {inbound.vendor?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {inbound._count?.items || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(inbound.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/inbound/${inbound.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title={t('viewDetails') || "View Details"}
                                                    >
                                                        <Eye size={16} className="text-(--color-text-secondary)" />
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
