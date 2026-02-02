'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { finalizeOpname, confirmFinalization } from '@/app/actions/counting-sheet';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface FinalizeOpnameViewProps {
    opnameId: string;
    matchedSheetIds: string[];
    onFinalized: () => void;
}

export function FinalizeOpnameView({ opnameId, matchedSheetIds, onFinalized }: FinalizeOpnameViewProps) {
    const router = useRouter();
    const [finalData, setFinalData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleComparSystem = async () => {
        setLoading(true);
        try {
            const result = await finalizeOpname(opnameId, matchedSheetIds);
            if (result.success) {
                setFinalData(result.data);
            } else {
                alert(result.error || 'Failed to compare with system stock');
            }
        } catch (error) {
            console.error('Comparison failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (createAdjustment: boolean) => {
        if (!confirm(createAdjustment
            ? 'This will finalize the Stock Opname and generate a Stock Adjustment draft. Continue?'
            : 'This will finalize the Stock Opname. Continue?'
        )) return;

        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('You must be logged in to finalize');
                setProcessing(false);
                return;
            }

            const result = await confirmFinalization(opnameId, matchedSheetIds, createAdjustment, user.id);
            if (result.success) {
                onFinalized();
                router.refresh();
            } else {
                alert(result.error || 'Failed to finalize opname');
            }
        } catch (error) {
            console.error('Finalization failed:', error);
        } finally {
            setProcessing(false);
        }
    };

    // Initial state: Button to start comparison
    if (!finalData) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-green-900">Sheets Matched!</h3>
                            <p className="text-sm text-green-700">
                                Counting sheets have been compared and match. Ready to verify against system stock.
                            </p>
                        </div>
                        <Button
                            onClick={handleComparSystem}
                            disabled={loading}
                            variant="primary"
                            className="flex items-center gap-2"
                        >
                            <CheckCircle size={18} />
                            {loading ? 'Analyzing...' : 'Compare with System Stock'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Results state: Show variance table and action buttons
    return (
        <Card className="border-gray-200 bg-white">
            <CardHeader className="border-b bg-gray-50 pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FileText size={18} />
                            Final Verification
                        </h3>
                        <p className="text-sm text-gray-500">
                            Comparison between physical count (matched sheets) and system stock
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex gap-8">
                    <div className="bg-gray-100 p-4 rounded-lg flex-1 text-center">
                        <div className="text-sm text-gray-500">Total Items</div>
                        <div className="text-2xl font-bold">{finalData.comparison.length}</div>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg flex-1 text-center">
                        <div className="text-sm text-green-700">Matches System</div>
                        <div className="text-2xl font-bold text-green-800">
                            {finalData.comparison.filter((c: any) => c.variance === 0).length}
                        </div>
                    </div>
                    <div className={`p-4 rounded-lg flex-1 text-center ${finalData.hasVariance ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <div className={`text-sm ${finalData.hasVariance ? 'text-red-700' : 'text-gray-500'}`}>
                            Variances
                        </div>
                        <div className={`text-2xl font-bold ${finalData.hasVariance ? 'text-red-800' : 'text-gray-800'}`}>
                            {finalData.comparison.filter((c: any) => c.variance !== 0).length}
                        </div>
                    </div>
                </div>

                {/* Variance Table - Only show rows with variance */}
                {finalData.hasVariance && (
                    <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-red-50 sticky top-0">
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-center">System Qty</TableHead>
                                    <TableHead className="text-center">Physical Qty</TableHead>
                                    <TableHead className="text-center">Variance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {finalData.comparison
                                    .filter((c: any) => c.variance !== 0)
                                    .map((item: any) => (
                                        <TableRow key={item.itemId}>
                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-center text-gray-500">
                                                {item.systemQty}
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {item.countedQty}
                                            </TableCell>
                                            <TableCell className={`text-center font-bold ${item.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.variance > 0 ? `+${item.variance}` : item.variance}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t gap-3">
                    {finalData.hasVariance ? (
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="text-sm text-red-600 flex items-center">
                                <AlertTriangle size={16} className="mr-2" />
                                Variances detected. A Stock Adjustment will be created.
                            </div>
                            <Button
                                onClick={() => handleConfirm(true)}
                                disabled={processing}
                                variant="primary"
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {processing ? 'Processing...' : 'Generate Stock Adjustment & Finalize'}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="text-sm text-green-600 flex items-center">
                                <CheckCircle size={16} className="mr-2" />
                                No variances found. Stock matches system perfectly.
                            </div>
                            <Button
                                onClick={() => handleConfirm(false)}
                                disabled={processing}
                                variant="primary"
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {processing ? 'Processing...' : 'Finalize Opname'}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
