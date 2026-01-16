'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOpnameById, updateOpnameCount, finalizeOpname } from '@/app/actions/opname';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, ArrowLeft, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";

export default function OpnameDetailPage() {
    const params = useParams();
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Local state for edits
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string);
        }
    }, [params.id]);

    const loadData = async (id: string) => {
        setLoading(true);
        const result = await getOpnameById(id);
        if (result.success) {
            setData(result.data);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleEditStart = (count: any) => {
        if (data.status === 'COMPLETED') return;
        setEditingId(count.id);
        setEditValue(count.counterAQty?.toString() || '');
    };

    const handleSaveCount = async (countId: string) => {
        if (!user) return;
        setSavingId(countId);
        const qty = parseInt(editValue);
        if (isNaN(qty)) return;

        const result = await updateOpnameCount(countId, qty, user.id);
        if (result.success) {
            // Update local data immediately for UI responsiveness
            const newData = { ...data };
            const idx = newData.counts.findIndex((c: any) => c.id === countId);
            if (idx >= 0) {
                newData.counts[idx].counterAQty = qty;
                newData.counts[idx].finalQty = qty;
                newData.counts[idx].variance = qty - newData.counts[idx].systemQty;
            }
            setData(newData);
            setEditingId(null);
        }
        setSavingId(null);
    };

    const handleFinalize = async () => {
        if (!confirm("Are you sure? This will complete the Audit.")) return;
        setIsFinalizing(true);
        await finalizeOpname(data.id);
        await loadData(data.id);
        setIsFinalizing(false);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-(--color-primary)" /></div>;
    if (!data) return <div className="p-8 text-center">Stock Opname session not found</div>;

    const getStatusBadge = (status: string) => {
        // ... (reuse badge logic)
        let color = "bg-gray-100 text-gray-800";
        if (status === 'SCHEDULED') color = "bg-blue-100 text-blue-800";
        if (status === 'IN_PROGRESS') color = "bg-amber-100 text-amber-800";
        if (status === 'COMPLETED') color = "bg-green-100 text-green-800";
        return <Badge className={color}>{status.replace(/_/g, ' ')}</Badge>;
    };

    // Calculate progress
    const totalItems = data.counts.length;
    const countedItems = data.counts.filter((c: any) => c.counterAQty !== null).length;
    const progress = Math.round((countedItems / totalItems) * 100) || 0;

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/opname">
                        <Button variant="ghost" size="md">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {data.opnameCode}
                            {getStatusBadge(data.status)}
                        </h1>
                        <p className="text-(--color-text-secondary)">
                            {format(new Date(data.scheduledDate), 'dd MMMM yyyy')} • {progress}% Counted
                        </p>
                    </div>
                </div>

                {data.status !== 'COMPLETED' && (
                    <Button onClick={handleFinalize} disabled={isFinalizing} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle size={18} className="mr-2" />
                        Finalize Audit
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader className="uppercase text-xs font-bold text-gray-500 border-b border-(--color-border) py-3">
                    Items to Count ({totalItems})
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead className="w-32 text-center">System Qty (Snapshot)</TableHead>
                                <TableHead className="w-40 text-center">Actual Count</TableHead>
                                <TableHead className="w-32 text-center">Variance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.counts.map((count: any) => {
                                const isEditing = editingId === count.id;
                                const isSaved = count.counterAQty !== null;
                                const hasVariance = count.variance !== 0 && isSaved;

                                return (
                                    <TableRow key={count.id} className={hasVariance ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                        <TableCell className="font-mono text-sm">{count.item.sku}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{count.item.name}</div>
                                            <div className="text-xs text-gray-400">{count.item.category?.name}</div>
                                        </TableCell>
                                        <TableCell className="text-center font-semibold text-gray-500 bg-gray-50/50 dark:bg-gray-800/50">
                                            {count.systemQty}
                                        </TableCell>
                                        <TableCell className="text-center p-2">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 justify-center">
                                                    <Input
                                                        autoFocus
                                                        type="number"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className="h-8 w-20 text-center"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveCount(count.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveCount(count.id)}
                                                        disabled={savingId === count.id}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {savingId === count.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => handleEditStart(count)}
                                                    className={`cursor-pointer border border-dashed border-gray-300 rounded py-1 px-3 inline-block min-w-12 hover:bg-white hover:border-blue-400 transition-colors ${isSaved ? 'font-bold' : 'text-gray-400 font-light'}`}
                                                >
                                                    {isSaved ? count.counterAQty : 'Tap to Count'}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isSaved && count.variance !== 0 ? (
                                                <Badge variant="danger" className="bg-red-100 text-red-800 border-red-200">
                                                    {count.variance > 0 ? '+' : ''}{count.variance}
                                                </Badge>
                                            ) : isSaved ? (
                                                <span className="text-green-600 font-bold text-sm"><CheckCircle size={16} className="inline" /> Match</span>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
