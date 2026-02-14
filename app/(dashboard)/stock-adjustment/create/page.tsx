'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Search, Plus, AlertTriangle, FileText, Settings, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { createStockAdjustment } from '@/app/actions/stock-adjustment';
import { searchItems } from '@/app/actions/items';

// Enums matching Prisma (manually defined for client)
enum AdjustmentType {
    MANUAL_WRITEOFF = 'MANUAL_WRITEOFF',
    DAMAGED = 'DAMAGED',
    EXPIRED = 'EXPIRED',
    OTHER = 'OTHER'
}

enum AdjustmentMethod {
    REAL_QTY = 'REAL_QTY',
    DELTA_QTY = 'DELTA_QTY'
}

enum DeltaType {
    INCREASE = 'INCREASE',
    DECREASE = 'DECREASE'
}

interface AdjustmentItem {
    itemId: string;
    sku: string;
    name: string;
    uom: string;
    systemQty: number;

    // For REAL_QTY
    qtyInput: number; // The real count or the delta amount

    // For DELTA_QTY
    deltaType: DeltaType;

    // Calculated
    variance: number;
    finalQty: number;

    reason: string;
}

function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function CreateStockAdjustmentPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    // Form State
    const [type, setType] = useState<AdjustmentType | ''>('');
    const [method, setMethod] = useState<AdjustmentMethod>(AdjustmentMethod.REAL_QTY);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<AdjustmentItem[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounceValue(searchQuery, 300);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [showResults, setShowResults] = useState(false);

    // Search Effect
    useEffect(() => {
        const doSearch = async () => {
            // Allow empty search to get default list
            setSearching(true);
            try {
                const results = await searchItems(debouncedSearch);
                setSearchResults(results);
                // Don't auto-show results on initial load, only if user typed something
                if (debouncedSearch) setShowResults(true);
            } catch (error) {
                console.error(error);
            } finally {
                setSearching(false);
            }
        };
        doSearch();
    }, [debouncedSearch]);

    // Close search on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleAddItem = (item: any) => {
        if (items.some(i => i.itemId === item.id)) {
            alert('Item already added');
            setSearchQuery('');
            setShowResults(false);
            return;
        }

        const newItem: AdjustmentItem = {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            uom: item.uom?.symbol || 'Unit',
            systemQty: item.currentStock,

            qtyInput: method === AdjustmentMethod.REAL_QTY ? item.currentStock : 0,
            deltaType: DeltaType.DECREASE, // Default to decrease (common for adjustments)

            variance: 0,
            finalQty: item.currentStock,
            reason: ''
        };

        setItems(prev => [...prev, newItem]);
        setSearchQuery('');
        setShowResults(false);
    };

    // Recalculate based on method change
    useEffect(() => {
        setItems(prev => prev.map(item => calculateItem(item, method)));
    }, [method]);

    const calculateItem = (item: AdjustmentItem, currentMethod: AdjustmentMethod): AdjustmentItem => {
        let variance = 0;
        let finalQty = item.systemQty;

        if (currentMethod === AdjustmentMethod.REAL_QTY) {
            // Input is the Real Qty
            finalQty = item.qtyInput;
            variance = finalQty - item.systemQty;
        } else {
            // Input is the Delta Amount
            const delta = item.qtyInput; // Absolute amount
            if (item.deltaType === DeltaType.INCREASE) {
                variance = delta;
                finalQty = item.systemQty + delta;
            } else {
                variance = -delta;
                finalQty = item.systemQty - delta;
            }
        }

        return { ...item, variance, finalQty };
    };

    const updateItem = (itemId: string, updates: Partial<AdjustmentItem>) => {
        setItems(prev => prev.map(item => {
            if (item.itemId !== itemId) return item;

            // Merge updates then recalculate
            const updated = { ...item, ...updates };
            // Ensure qtyInput is number
            if (typeof updates.qtyInput !== 'undefined') {
                updated.qtyInput = Number(updates.qtyInput);
            }

            return calculateItem(updated, method);
        }));
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(prev => prev.filter(i => i.itemId !== itemId));
    };

    const handleSubmit = async () => {
        if (!type) {
            alert('Please select an adjustment category (Type)');
            return;
        }
        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        // Validation
        const invalidItems = items.filter(i => i.finalQty < 0);
        if (invalidItems.length > 0) {
            alert(`Cannot submit: ${invalidItems.length} items utilize negative stock.`);
            return;
        }

        const zeroVariance = items.filter(i => i.variance === 0);
        if (zeroVariance.length > 0) {
            if (!confirm(`${zeroVariance.length} items have NO CHANGE (0 variance). Continue?`)) return;
        }

        setSaving(true);
        try {
            // Prepare payload
            const payloadItems = items.map(i => ({
                itemId: i.itemId,
                systemQty: i.systemQty,
                method: method,
                deltaType: method === AdjustmentMethod.DELTA_QTY ? i.deltaType : undefined,
                qtyInput: i.qtyInput,
                reason: i.reason
            }));

            const result = await createStockAdjustment({
                userId: '3c014909-ecd7-4e61-ae1c-c71c7ae819f9', // Valid user ID from DB
                type: type as any,
                source: 'MANUAL' as any,
                notes,
                items: payloadItems
            });

            if (result.success) {
                router.push('/stock-adjustment');
                router.refresh();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save adjustment');
        } finally {
            setSaving(false);
        }
    };

    const getTypeColor = (deltaType: DeltaType) => {
        return deltaType === DeltaType.INCREASE ? 'text-green-600' : 'text-red-600';
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/stock-adjustment">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">New Stock Adjustment</h1>
                    <p className="text-gray-500">Create a manual adjustment request</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="font-semibold text-lg">Configuration</CardHeader>
                        <CardContent className="space-y-4">
                            {/* Type Select */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Adjustment Reason (Type)</label>
                                <select
                                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as AdjustmentType)}
                                >
                                    <option value="" disabled className="text-gray-400">Select Reason</option>
                                    {Object.values(AdjustmentType).map((t) => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Method Select */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Calculation Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div
                                        onClick={() => setMethod(AdjustmentMethod.REAL_QTY)}
                                        className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${method === AdjustmentMethod.REAL_QTY
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        <div className="font-semibold text-sm">Real Quantity</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total physical count</div>
                                    </div>
                                    <div
                                        onClick={() => setMethod(AdjustmentMethod.DELTA_QTY)}
                                        className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${method === AdjustmentMethod.DELTA_QTY
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        <div className="font-semibold text-sm">Delta Quantity</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add/remove amount</div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">General Notes</label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Optional description..."
                                    className="min-h-[100px] bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                />
                            </div>
                        </CardContent>
                    </Card>


                </div>

                {/* Right Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="font-semibold text-lg border-b dark:border-gray-700">Add Items</CardHeader>
                        <CardContent className="relative py-6" ref={searchRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search name or SKU..."
                                    className="pl-9 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onClick={() => setShowResults(true)}
                                    onFocus={() => {
                                        setShowResults(true);
                                    }}
                                />
                            </div>

                            {/* Results Dropdown */}
                            {showResults && (
                                <div className="absolute z-10 w-full left-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto">
                                    {searching ? (
                                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Searching...</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No items found</div>
                                    ) : (
                                        <ul>
                                            {searchResults.map((item: any) => (
                                                <li
                                                    key={item.id}
                                                    onClick={() => handleAddItem(item)}
                                                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 dark:border-gray-700"
                                                >
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        <span>{item.sku}</span>
                                                        <span>Qty: {item.currentStock} {item.uom?.symbol}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="h-full flex flex-col border-none shadow-none md:border md:shadow-sm dark:bg-gray-800 dark:border-gray-700">
                        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b dark:border-gray-700">
                            <h2 className="text-lg font-semibold">Adjustment Items ({items.length})</h2>
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                variant="primary"
                                className="gap-2 shadow-sm"
                            >
                                <Save size={16} />
                                {saving ? 'Processing...' : 'Submit Adjustment'}
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 flex-1 bg-gray-50/30">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                                        <FileText size={32} className="text-gray-300" />
                                    </div>
                                    <p className="font-medium text-gray-600">No items added</p>
                                    <p className="text-sm">Search and select items to begin adjustment</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-white dark:bg-gray-800">
                                            <TableRow className="border-b dark:border-gray-700">
                                                <TableHead className="w-[30%] text-gray-500 dark:text-gray-400">Item Details</TableHead>
                                                <TableHead className="text-right text-gray-500 dark:text-gray-400">System Qty</TableHead>

                                                {/* Dynamic Headers based on Method */}
                                                {method === AdjustmentMethod.REAL_QTY ? (
                                                    <>
                                                        <TableHead className="text-right w-32 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Real Qty</TableHead>
                                                        <TableHead className="text-right text-gray-500 dark:text-gray-400">Variance</TableHead>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableHead className="text-center w-32 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Action</TableHead>
                                                        <TableHead className="text-right w-24 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Amount</TableHead>
                                                        <TableHead className="text-right text-gray-500 dark:text-gray-400">Final Qty</TableHead>
                                                    </>
                                                )}

                                                <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item) => (
                                                <TableRow key={item.itemId} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b dark:border-gray-700">
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-600 dark:text-gray-300 font-mono">
                                                        {item.systemQty} <span className="text-xs text-gray-400">{item.uom}</span>
                                                    </TableCell>

                                                    {/* Dynamic Inputs */}
                                                    {method === AdjustmentMethod.REAL_QTY ? (
                                                        <>
                                                            <TableCell className="text-right bg-blue-50/30 dark:bg-blue-900/10">
                                                                <Input
                                                                    type="number"
                                                                    className="h-9 w-28 text-right font-mono ml-auto border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:bg-gray-900 dark:text-white"
                                                                    value={item.qtyInput}
                                                                    onChange={(e) => updateItem(item.itemId, { qtyInput: Number(e.target.value) })}
                                                                />
                                                            </TableCell>
                                                            <TableCell className={`text-right font-bold ${item.variance > 0 ? 'text-green-600 dark:text-green-400' : item.variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                                                {item.variance > 0 ? '+' : ''}{item.variance}
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell className="bg-blue-50/30 dark:bg-blue-900/10">
                                                                <div className="flex justify-center">
                                                                    <div className="flex bg-white dark:bg-gray-900 rounded-md border dark:border-gray-600 text-xs overflow-hidden">
                                                                        <button
                                                                            className={`px-2 py-1 flex items-center gap-1 ${item.deltaType === DeltaType.INCREASE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                                                                            onClick={() => updateItem(item.itemId, { deltaType: DeltaType.INCREASE })}
                                                                        >
                                                                            <Plus size={12} /> Add
                                                                        </button>
                                                                        <div className="w-px bg-gray-200 dark:bg-gray-600"></div>
                                                                        <button
                                                                            className={`px-2 py-1 flex items-center gap-1 ${item.deltaType === DeltaType.DECREASE ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                                                                            onClick={() => updateItem(item.itemId, { deltaType: DeltaType.DECREASE })}
                                                                        >
                                                                            <Minus size={12} /> Rem
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right bg-blue-50/30 dark:bg-blue-900/10">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    className="h-9 w-24 text-right font-mono ml-auto border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:bg-gray-900 dark:text-white"
                                                                    value={item.qtyInput}
                                                                    onChange={(e) => updateItem(item.itemId, { qtyInput: Math.abs(Number(e.target.value)) })}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-medium text-gray-700 dark:text-gray-300">
                                                                {item.finalQty}
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveItem(item.itemId)}
                                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
