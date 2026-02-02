'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Eye, Play, XCircle, RefreshCw, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { generateCountingSheet, getCountingSheets } from '@/app/actions/counting-sheet';
import { getOpnameById } from '@/app/actions/opname';
import { SheetComparisonView } from '@/components/opname/SheetComparisonView';
import { FinalizeOpnameView } from '@/components/opname/FinalizeOpnameView';

export default function StockOpnameDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string);
        }
    }, [params.id]);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            // Load opname data and sheets
            const [opnameRes, sheetsRes] = await Promise.all([
                getOpnameById(id),
                getCountingSheets(id)
            ]);

            if (opnameRes.success) {
                setData(opnameRes.data);
            }

            if (sheetsRes.success) {
                setSheets(sheetsRes.data || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSheet = async () => {
        if (!params.id) return;

        setGenerating(true);
        try {
            const result = await generateCountingSheet(params.id as string);
            if (result.success) {
                await loadData(params.id as string);
            } else {
                alert(result.error || 'Failed to generate counting sheet');
            }
        } catch (error) {
            console.error('Failed to generate sheet:', error);
            alert('Failed to generate counting sheet');
        } finally {
            setGenerating(false);
        }
    };

    const handleStartCounting = (sheetId: string) => {
        router.push(`/opname/${params.id}/sheet/${sheetId}`);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: 'bg-gray-100 text-gray-700',
            COUNTING: 'bg-blue-100 text-blue-700',
            SUBMITTED: 'bg-green-100 text-green-700',
            MATCHED: 'bg-emerald-100 text-emerald-700',
            REJECTED: 'bg-red-100 text-red-700'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
                {status}
            </span>
        );
    };

    const getOpnameStatusBadge = (status: string) => {
        const styles = {
            SCHEDULED: 'bg-gray-100 text-gray-700',
            COUNTING: 'bg-blue-100 text-blue-700',
            COMPARING: 'bg-yellow-100 text-yellow-700',
            RECONCILING: 'bg-orange-100 text-orange-700',
            FINALIZED: 'bg-green-100 text-green-700',
            COMPLETED_WITH_ADJUSTMENT: 'bg-amber-100 text-amber-700'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles] || styles.SCHEDULED}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6">
                <div className="text-red-500">Stock opname not found</div>
            </div>
        );
    }

    const submittedSheets = sheets.filter(s => s.status === 'SUBMITTED');
    const matchedSheets = sheets.filter(s => s.status === 'MATCHED');

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/opname">
                        <Button variant="ghost" size="md">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{data.opnameCode}</h1>
                            {getOpnameStatusBadge(data.status)}
                        </div>
                        <p className="text-gray-500">
                            {format(new Date(data.scheduledDate), 'dd MMMM yyyy')}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {['FINALIZED', 'COMPLETED_WITH_ADJUSTMENT'].includes(data.status) && (
                        <Link href={`/opname/${params.id}/print`} target="_blank">
                            <Button variant="secondary" className="flex items-center gap-2">
                                <FileText size={18} />
                                Print Berita Acara
                            </Button>
                        </Link>
                    )}
                    <Button
                        onClick={handleGenerateSheet}
                        disabled={generating || ['FINALIZED', 'COMPLETED_WITH_ADJUSTMENT'].includes(data.status)}
                        variant="primary"
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} />
                        {generating ? 'Generating...' : 'Generate Blank Sheet'}
                    </Button>
                </div>
            </div>

            {/* Opname Info Card */}
            <Card>
                <CardHeader>Stock Opname Information</CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-500">Warehouse</div>
                            <div className="font-medium">{data.warehouse?.name || 'All Warehouses'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Total Items</div>
                            <div className="font-medium">{data.counts?.length || 0} items</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Total Sheets Generated</div>
                            <div className="font-medium">{sheets.length} sheets</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Submitted Sheets</div>
                            <div className="font-medium">{submittedSheets.length} sheets</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Counting Sheets Table */}
            <Card>
                <CardHeader className="uppercase text-xs font-bold text-gray-500">
                    Counting Sheets ({sheets.length})
                </CardHeader>
                <CardContent className="p-0">
                    {sheets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <FileText size={48} className="mx-auto mb-3 opacity-30" />
                            <p>No counting sheets generated yet</p>
                            <p className="text-sm mt-1">Click "Generate Blank Sheet" to create one</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="w-24">Sheet #</TableHead>
                                    <TableHead>Counter Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="w-32 text-center">Status</TableHead>
                                    <TableHead className="w-32 text-center">Progress</TableHead>
                                    <TableHead className="w-40">Submitted At</TableHead>
                                    <TableHead className="w-48 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sheets.map((sheet) => (
                                    <TableRow key={sheet.id}>
                                        <TableCell className="font-mono font-bold">
                                            #{sheet.sheetNumber}
                                        </TableCell>
                                        <TableCell>
                                            {sheet.counterName || <span className="text-gray-400">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            {sheet.counterRole || <span className="text-gray-400">—</span>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(sheet.status)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">
                                                {sheet.itemsCounted} / {sheet.totalItems}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {sheet.submittedAt
                                                ? format(new Date(sheet.submittedAt), 'dd MMM yyyy HH:mm')
                                                : <span className="text-gray-400">—</span>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                {sheet.status === 'DRAFT' && (
                                                    <Button
                                                        onClick={() => handleStartCounting(sheet.id)}
                                                        size="sm"
                                                        variant="primary"
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Play size={14} />
                                                        Start Counting
                                                    </Button>
                                                )}
                                                {sheet.status === 'COUNTING' && (
                                                    <Button
                                                        onClick={() => handleStartCounting(sheet.id)}
                                                        size="sm"
                                                        variant="secondary"
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Play size={14} />
                                                        Continue
                                                    </Button>
                                                )}
                                                {(sheet.status === 'SUBMITTED' || sheet.status === 'MATCHED') && (
                                                    <Button
                                                        onClick={() => router.push(`/opname/${params.id}/sheet/${sheet.id}`)}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Eye size={14} />
                                                        View
                                                    </Button>
                                                )}
                                                {sheet.status === 'REJECTED' && (
                                                    <Button
                                                        onClick={() => handleStartCounting(sheet.id)}
                                                        size="sm"
                                                        variant="danger"
                                                        className="flex items-center gap-1"
                                                    >
                                                        <RefreshCw size={14} />
                                                        Recount
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Comparison Section - Show when 2+ sheets are submitted */}
            {submittedSheets.length >= 2 && matchedSheets.length === 0 && (
                <SheetComparisonView
                    sheets={sheets}
                    onComparisonComplete={() => loadData(params.id as string)}
                />
            )}

            {/* Finalization Section - Show when sheets match */}
            {matchedSheets.length >= 2 && (
                <FinalizeOpnameView
                    opnameId={params.id as string}
                    matchedSheetIds={matchedSheets.map(s => s.id)}
                    onFinalized={() => loadData(params.id as string)}
                />
            )}
        </div>
    );
}
