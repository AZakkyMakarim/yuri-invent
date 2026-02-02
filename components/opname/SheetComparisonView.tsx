'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { compareSheets, markSheetForRecount } from '@/app/actions/counting-sheet';

interface SheetComparisonViewProps {
    sheets: any[];
    onComparisonComplete: () => void;
}

export function SheetComparisonView({ sheets, onComparisonComplete }: SheetComparisonViewProps) {
    const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
    const [comparisonResult, setComparisonResult] = useState<any>(null);
    const [comparing, setComparing] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const handleSheetSelect = (sheetId: string) => {
        if (selectedSheets.includes(sheetId)) {
            setSelectedSheets(selectedSheets.filter(id => id !== sheetId));
        } else {
            if (selectedSheets.length < 2) {
                setSelectedSheets([...selectedSheets, sheetId]);
            }
        }
    };

    const handleCompare = async () => {
        if (selectedSheets.length !== 2) return;

        setComparing(true);
        try {
            const result = await compareSheets(selectedSheets[0], selectedSheets[1]);
            if (result.success && result.data) {
                setComparisonResult(result.data);
                // If all matched, notify parent to refresh
                if (result.data.allMatched) {
                    onComparisonComplete();
                }
            } else {
                alert(result.error || 'Failed to compare sheets');
            }
        } catch (error) {
            console.error('Comparison failed:', error);
            alert('An error occurred during comparison');
        } finally {
            setComparing(false);
        }
    };

    const handleReject = async (sheetId: string) => {
        if (!confirm('Are you sure you want to reject this sheet and request a recount?')) return;

        setRejecting(true);
        try {
            const result = await markSheetForRecount(sheetId);
            if (result.success) {
                onComparisonComplete(); // Reload data
                setComparisonResult(null);
                setSelectedSheets([]);
            } else {
                alert(result.error || 'Failed to reject sheet');
            }
        } catch (error) {
            console.error('Rejection failed:', error);
        } finally {
            setRejecting(false);
        }
    };

    // Filter to only SUBMITTED sheets
    const submittedSheets = sheets.filter(s => s.status === 'SUBMITTED');

    if (submittedSheets.length < 2 && !comparisonResult) return null;

    return (
        <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="border-blue-200 bg-blue-100/50 pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-blue-900 flex items-center gap-2">
                            <CheckCircle size={18} />
                            Comparison & Reconciliation
                        </h3>
                        <p className="text-sm text-blue-700">
                            Select 2 sheets to compare for discrepancies
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {!comparisonResult ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {submittedSheets.map(sheet => (
                                <div
                                    key={sheet.id}
                                    onClick={() => handleSheetSelect(sheet.id)}
                                    className={`
                                        cursor-pointer border rounded-lg p-4 transition-all
                                        ${selectedSheets.includes(sheet.id)
                                            ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-500/20'
                                            : 'border-blue-200 bg-white hover:border-blue-400'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-blue-900">Sheet #{sheet.sheetNumber}</div>
                                            <div className="text-sm text-blue-700">{sheet.counterName}</div>
                                        </div>
                                        <div className="text-xs font-mono bg-blue-100/50 px-2 py-1 rounded">
                                            {sheet.itemsCounted} items
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleCompare}
                                disabled={selectedSheets.length !== 2 || comparing}
                                variant="primary"
                            >
                                {comparing ? 'Comparing...' : 'Compare Selected Sheets'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200">
                            <div className="flex gap-6 text-sm">
                                <div>
                                    <div className="text-gray-500">Matched</div>
                                    <div className="text-xl font-bold text-green-600">{comparisonResult.matchedItems}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Mismatched</div>
                                    <div className="text-xl font-bold text-red-600">{comparisonResult.mismatchedItems}</div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setComparisonResult(null)}>
                                Close Comparison
                            </Button>
                        </div>

                        {comparisonResult.mismatchedItems > 0 ? (
                            <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-red-50">
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead className="text-center">Sheet #{sheets.find(s => s.id === selectedSheets[0])?.sheetNumber}</TableHead>
                                            <TableHead className="text-center">Sheet #{sheets.find(s => s.id === selectedSheets[1])?.sheetNumber}</TableHead>
                                            <TableHead className="text-center">Diff</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {comparisonResult.comparison
                                            .filter((c: any) => !c.isMatching)
                                            .map((item: any) => (
                                                <TableRow key={item.itemId}>
                                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell className="text-center bg-red-50/50">
                                                        {item.sheet1Qty ?? '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center bg-red-50/50">
                                                        {item.sheet2Qty ?? '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-red-600">
                                                        {Math.abs(item.difference)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        }
                                    </TableBody>
                                </Table>
                                <div className="p-4 bg-red-50 border-t border-red-100 flex justify-end gap-3">
                                    <div className="text-sm text-red-700 flex items-center mr-auto">
                                        <AlertTriangle size={16} className="mr-2" />
                                        Discrepancies found. Which sheet should be rejected for recounting?
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        disabled={rejecting}
                                        onClick={() => handleReject(selectedSheets[0])}
                                    >
                                        Reject Sheet #{sheets.find(s => s.id === selectedSheets[0])?.sheetNumber}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        disabled={rejecting}
                                        onClick={() => handleReject(selectedSheets[1])}
                                    >
                                        Reject Sheet #{sheets.find(s => s.id === selectedSheets[1])?.sheetNumber}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={rejecting}
                                        onClick={() => {
                                            if (confirm("Are you sure? This will reject BOTH sheets.")) {
                                                handleReject(selectedSheets[0]).then(() => handleReject(selectedSheets[1]));
                                            }
                                        }}
                                    >
                                        Reject Both
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
                                <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
                                <h3 className="font-bold text-green-800 text-lg">Perfect Match!</h3>
                                <p className="text-green-700">All items match between these two sheets.</p>
                                <Button className="mt-4" onClick={onComparisonComplete}>
                                    Refresh Status
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
