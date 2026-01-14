'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Plus,
    Search,
    FileText,
    Loader2,
    Eye,
    Pencil,
    Trash2,
    Filter
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequests, deletePurchaseRequest } from '@/app/actions/purchase'; // Import server actions


export default function PRListPage() {
    const router = useRouter();
    // const { toast } = useToast(); // If unavailable, use alert
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadData();
    }, [search, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        // Add debounce if search is active? For now direct call
        const result = await getPurchaseRequests(1, 50, search, statusFilter);
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this PR? This action cannot be undone.')) return;

        const result = await deletePurchaseRequest(id);
        if (result.success) {
            // toast({ title: "PR Deleted" }); 
            loadData();
        } else {
            alert('Failed to delete: ' + result.error);
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
                {status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Purchase Requests
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Manage material purchase requests
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/purchase/input')}
                    className="bg-(--color-primary) hover:bg-(--color-primary)/90 shadow-lg shadow-(--color-primary)/20"
                >
                    <Plus size={18} className="mr-2" />
                    Create Request
                </Button>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                            <Input
                                placeholder="Search PR Number or Notes..."
                                className="pl-9 bg-(--color-bg-secondary) border-(--color-border)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {/* Simple Status Filter - Can be upgraded to MultiSelect later */}
                            <select
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="DRAFT">Draft</option>
                                <option value="PENDING_MANAGER_APPROVAL">Pending Manager</option>
                                <option value="PENDING_PURCHASING_APPROVAL">Pending Purchasing</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-(--color-border) overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>PR Number</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>Loading data...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-(--color-text-muted)">
                                            No Purchase Requests found.
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
                                                        title="View Details"
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
