'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Send, CheckCircle, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { getCountingSheetById, batchUpdateSheetCounts, submitCountingSheet } from '@/app/actions/counting-sheet';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/app/actions/auth';

export default function CountingSheetPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [counterName, setCounterName] = useState('');
    const [counterRole, setCounterRole] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isUserLoaded, setIsUserLoaded] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const profile = await getUserProfile(user.id);
                    if (profile) {
                        setCounterName(profile.name || '');
                        setCounterRole(profile.role?.name || '');
                        setIsUserLoaded(true);
                    }
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (params.sheetId) {
            loadData(params.sheetId as string);
        }
    }, [params.sheetId]);

    const loadData = async (sheetId: string) => {
        setLoading(true);
        try {
            const result = await getCountingSheetById(sheetId);
            if (result.success && result.data) {
                setData(result.data);

                // Initialize counts and notes from existing data
                const initialCounts: Record<string, string> = {};
                const initialNotes: Record<string, string> = {};

                result.data.items.forEach((item: any) => {
                    if (item.countedQty !== null) {
                        // Format with Indonesian locale
                        initialCounts[item.id] = new Intl.NumberFormat('id-ID').format(item.countedQty);
                    }
                    if (item.notes) {
                        initialNotes[item.id] = item.notes;
                    }
                });

                setCounts(initialCounts);
                setNotes(initialNotes);
            } else {
                alert(result.error || 'Failed to load counting sheet');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (): Promise<boolean> => {
        if (!params.sheetId) return false;

        setSaving(true);
        try {
            // Convert counts to numbers or null
            const numericCounts: Record<string, number | null> = {};
            Object.entries(counts).forEach(([id, value]) => {
                if (!value || value.trim() === '') {
                    numericCounts[id] = null;
                } else {
                    // Remove dots and replace comma with dot for parsing
                    const normalized = value.replace(/\./g, '').replace(',', '.');
                    const num = parseFloat(normalized);
                    if (!isNaN(num)) {
                        numericCounts[id] = num;
                    }
                }
            });

            const result = await batchUpdateSheetCounts(
                params.sheetId as string,
                numericCounts,
                notes
            );

            if (!result.success) {
                alert(result.error || 'Failed to save counts');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save counts');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!counterName.trim()) {
            alert('Please enter your name');
            return;
        }

        if (!params.sheetId) return;

        // Save first to ensure latest data
        const saved = await handleSave();
        if (!saved) return;

        setSubmitting(true);
        try {
            const result = await submitCountingSheet(
                params.sheetId as string,
                counterName,
                counterRole || undefined
            );

            if (result.success) {
                router.push(`/opname/${params.id}`);
            } else {
                alert(result.error || 'Failed to submit counting sheet');
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            alert('Failed to submit counting sheet');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCountChange = (itemId: string, value: string) => {
        // Prevent minus sign
        if (value.includes('-')) return;

        // Allow digits only (system uses Integer)
        let clean = value.replace(/[^0-9]/g, '');

        // Handle formatting (simple implementation)
        if (clean) {
            const parts = clean.split(',');
            // Format integer part with dots
            parts[0] = parts[0].replace(/\./g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            // Rejoin with comma
            clean = parts.slice(0, 2).join(',');
        }

        setCounts(prev => ({ ...prev, [itemId]: clean }));
    };

    const handleNoteChange = (itemId: string, value: string) => {
        setNotes(prev => ({ ...prev, [itemId]: value }));
    };

    // Auto-save every 30 seconds
    useEffect(() => {
        const isReadOnly = data?.status === 'SUBMITTED' || data?.status === 'MATCHED';
        if (data?.status && !isReadOnly) {
            const timer = setInterval(() => {
                handleSave();
            }, 30000);

            return () => clearInterval(timer);
        }
    }, [counts, notes, data?.status]);

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
                <div className="text-red-500">Counting sheet not found</div>
            </div>
        );
    }

    const itemsCounted = data.items.filter((item: any) =>
        counts[item.id] && counts[item.id].trim() !== ''
    ).length;
    const totalItems = data.items.length;
    const isReadOnly = data.status === 'SUBMITTED' || data.status === 'MATCHED';

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/opname/${params.id}`}>
                        <Button variant="ghost" size="md">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">
                                {data.stockOpname.opnameCode} - Sheet #{data.sheetNumber}
                            </h1>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${data.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                                data.status === 'COUNTING' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {data.status}
                            </span>
                        </div>
                        <p className="text-gray-500">
                            Progress: {itemsCounted} / {totalItems} items counted
                        </p>
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            variant="ghost"
                            className="flex items-center gap-2"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                            onClick={() => setShowSubmitDialog(true)}
                            disabled={itemsCounted < totalItems}
                            variant="primary"
                            className="flex items-center gap-2"
                        >
                            <Send size={18} />
                            Submit Sheet
                        </Button>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(itemsCounted / totalItems) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-600">
                            {Math.round((itemsCounted / totalItems) * 100)}%
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
                <CardHeader className="uppercase text-xs font-bold text-gray-500">
                    Items to Count ({totalItems})
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead className="w-32 text-center">My Count</TableHead>
                                <TableHead className="w-24 text-center">Unit</TableHead>
                                <TableHead className="w-48 text-center">Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-sm">
                                        {item.item.sku}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.item.name}</div>
                                        <div className="text-xs text-gray-400">
                                            {item.item.category?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center p-2">
                                        <Input
                                            type="text"
                                            value={counts[item.id] || ''}
                                            onChange={e => handleCountChange(item.id, e.target.value)}
                                            className="h-9 w-24 text-center mx-auto"
                                            placeholder="—"
                                            disabled={isReadOnly}
                                            inputMode="decimal"
                                        />
                                    </TableCell>
                                    <TableCell className="text-center text-sm font-semibold text-gray-600">
                                        {item.item.uom?.symbol || '—'}
                                    </TableCell>
                                    <TableCell className="text-center p-2">
                                        <Input
                                            type="text"
                                            value={notes[item.id] || ''}
                                            onChange={e => handleNoteChange(item.id, e.target.value)}
                                            className="h-9 w-full text-sm"
                                            placeholder="—"
                                            disabled={isReadOnly}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Submit Dialog */}
            {showSubmitDialog && (
                <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Submit Counting Sheet</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 px-6">
                            <div>
                                <label className="block font-medium mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs">
                                    Submitting As
                                </label>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                                            {counterName || 'Unknown User'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            <Shield size={12} className="text-gray-400 dark:text-gray-500" />
                                            {counterRole || 'No Role'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                    <div className="text-sm text-blue-900 dark:text-blue-100">
                                        <p className="font-semibold mb-1">All items counted!</p>
                                        <p className="text-blue-700 dark:text-blue-300">You have counted all {totalItems} items. Once submitted, this sheet cannot be edited.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end py-4 px-6">
                            <Button
                                onClick={() => setShowSubmitDialog(false)}
                                variant="ghost"
                                className="dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !counterName.trim()}
                                variant="primary"
                                className="flex items-center gap-2"
                            >
                                <Send size={16} />
                                {submitting ? 'Submitting...' : 'Submit Sheet'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
