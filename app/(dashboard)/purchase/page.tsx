'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Plus,
    Loader2,
    Eye,
    Pencil,
    Trash2,
} from 'lucide-react';
import {
    Button,
    Card,
    CardContent,
    Badge,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFilters,
    FilterField,
    TextFilter,
    MultiSelectFilter,
    DateRangeFilter
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequests, deletePurchaseRequest } from '@/app/actions/purchase'; // Import server actions
import { getVendors } from '@/app/actions/vendors';
import { useTranslations } from 'next-intl';

interface Filters {
    search: string;
    status: string[];
    vendorId: string[];
    dateStart: string;
    dateEnd: string;
}

const defaultFilters: Filters = {
    search: '',
    status: [],
    vendorId: [],
    dateStart: '',
    dateEnd: '',
};

export default function PRListPage() {
    const router = useRouter();
    const t = useTranslations('purchase');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);
    const [vendors, setVendors] = useState<any[]>([]);

    useEffect(() => {
        loadVendors();
    }, []);

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadVendors = async () => {
        const result = await getVendors();
        if (result.success) {
            setVendors(result.data || []);
        }
    };

    const loadData = async () => {
        setLoading(true);
        const statusStr = filters.status.join(',');
        const effectiveVendorId = filters.vendorId.join(',');

        const result = await getPurchaseRequests(
            1,
            50,
            filters.search,
            statusStr,
            effectiveVendorId,
            filters.dateStart,
            filters.dateEnd
        );

        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;

        const result = await deletePurchaseRequest(id);
        if (result.success) {
            loadData();
        } else {
            alert('Failed to delete: ' + result.error);
        }
    };

    const applyFilters = () => {
        setFilters(pendingFilters);
    };

    const resetFilters = () => {
        setPendingFilters(defaultFilters);
        setFilters(defaultFilters);
    };

    // Check if there are active filters
    const hasActiveFilters =
        filters.search !== '' ||
        filters.status.length > 0 ||
        filters.vendorId.length > 0 ||
        filters.dateStart !== '' ||
        filters.dateEnd !== '';

    // Vendor Options for MultiSelect
    const vendorOptions = vendors.map(v => v.id);
    const formatVendorLabel = (id: string) => {
        const vendor = vendors.find(v => v.id === id);
        return vendor ? vendor.name : id;
    };

    const statusOptions = [
        'DRAFT',
        'PENDING_MANAGER_APPROVAL',
        'PENDING_PURCHASING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
    ];

    const formatStatusLabel = (status: string) => {
        try {
            return t(`status.${status}`);
        } catch {
            return status.replace(/_/g, ' ');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: "bg-gray-100 text-gray-800 hover:bg-gray-200",
            PENDING_MANAGER_APPROVAL: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
            PENDING_PURCHASING_APPROVAL: "bg-orange-100 text-orange-800 hover:bg-orange-200",
            APPROVED: "bg-green-100 text-green-800 hover:bg-green-200",
            REJECTED: "bg-red-100 text-red-800 hover:bg-red-200",
            CANCELLED: "bg-gray-200 text-gray-600 hover:bg-gray-300",
        };

        return (
            <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
                {formatStatusLabel(status)}
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
                <Button
                    onClick={() => router.push('/purchase/input')}
                    className="bg-(--color-primary) hover:bg-(--color-primary)/90 shadow-lg shadow-(--color-primary)/20"
                >
                    <Plus size={18} className="mr-2" />
                    {t('createRequest')}
                </Button>
            </div>

            {/* Standard Filter Panel */}
            <TableFilters
                hasActiveFilters={hasActiveFilters}
                onApply={applyFilters}
                onReset={resetFilters}
            >
                <FilterField label={'ID Pengajuan'}>
                    <TextFilter
                        value={pendingFilters.search}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, search: v })}
                        placeholder={'ID Pengajuan'}
                    />
                </FilterField>

                <FilterField label={t('table.vendor')}>
                    <MultiSelectFilter
                        options={vendorOptions}
                        selected={pendingFilters.vendorId}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, vendorId: v })}
                        placeholder="Cari Vendor"
                        formatLabel={formatVendorLabel}
                    />
                </FilterField>

                <FilterField label={'Status'}>
                    <MultiSelectFilter
                        options={statusOptions}
                        selected={pendingFilters.status}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, status: v })}
                        placeholder={t('allStatus')}
                        formatLabel={formatStatusLabel}
                    />
                </FilterField>

                <FilterField label="Range Tanggal">
                    <DateRangeFilter
                        startDate={pendingFilters.dateStart}
                        endDate={pendingFilters.dateEnd}
                        onChange={(s, e) => setPendingFilters({ ...pendingFilters, dateStart: s, dateEnd: e })}
                    />
                </FilterField>
            </TableFilters>

            <Card className="border-(--color-border) shadow-xs">
                <CardContent className="p-0">
                    <div className="rounded-md border border-(--color-border) overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>{t('table.prNumber')}</TableHead>
                                    <TableHead>{t('table.date')}</TableHead>
                                    <TableHead>{t('table.vendor')}</TableHead>
                                    <TableHead>{t('table.createdBy')}</TableHead>
                                    <TableHead className="text-right">{t('table.totalAmount')}</TableHead>
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
                                    data.map((pr) => (
                                        <TableRow key={pr.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium text-(--color-text-primary)">
                                                {pr.prNumber}
                                                {pr.notes && <div className="text-xs text-(--color-text-muted) truncate max-w-[200px]">{pr.notes}</div>}
                                            </TableCell>
                                            <TableCell>{format(new Date(pr.requestDate), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{pr.vendor?.name}</TableCell>
                                            <TableCell className="text-xs text-(--color-text-secondary)">{pr.createdBy?.name}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(Number(pr.totalAmount))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(pr.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/purchase/${pr.id}`)}
                                                        title={t('managerVerification.actions.viewDetails')}
                                                    >
                                                        <Eye size={16} className="text-(--color-text-secondary)" />
                                                    </Button>

                                                    {/* Edit Button: Visible for DRAFT and REJECTED */}
                                                    {(pr.status === 'DRAFT' || pr.status === 'REJECTED') && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/purchase/${pr.id}/edit`)}
                                                                title="Edit"
                                                            >
                                                                <Pencil size={16} className="text-blue-500" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(pr.id)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} className="text-red-500" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
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
