'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getAllItems, createRAB, calculateRABLineStats } from '@/app/actions/rab';
import Link from 'next/link';

type RABLine = {
    id: string; // internal id for key
    itemId: string;
    sku: string;
    itemName: string;
    requiredStock: number;
    lastStock: number;
    replenishStock: number;
    unitPrice: number;
    totalCost: number;
    notes: string;
};

export default function ClientRABForm() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Header Data
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [fiscalMonth, setFiscalMonth] = useState(new Date().getMonth() + 1);
    const [currency, setCurrency] = useState('IDR');

    // Master Data
    const [items, setItems] = useState<{ id: string; sku: string; name: string }[]>([]);

    // Lines
    const [lines, setLines] = useState<RABLine[]>([]);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setPageLoading(true);
        const res = await getAllItems();
        if (res.success && res.data) {
            setItems(res.data);
        }
        setPageLoading(false);
    };

    const addLine = () => {
        setLines([
            ...lines,
            {
                id: crypto.randomUUID(),
                itemId: '',
                sku: '',
                itemName: '',
                requiredStock: 0,
                lastStock: 0,
                replenishStock: 0,
                unitPrice: 0,
                totalCost: 0,
                notes: ''
            }
        ]);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: keyof RABLine, value: any) => {
        setLines(prevLines => prevLines.map(line => {
            if (line.id !== id) return line;
            return { ...line, [field]: value };
        }));
    };

    // Determine Replenish and Total Cost when inputs change
    const handleLineChange = async (id: string, field: 'itemId' | 'requiredStock', value: any) => {
        let updatedLine = lines.find(l => l.id === id);
        if (!updatedLine) return;

        if (field === 'itemId') {
            const selectedItem = items.find(i => i.id === value);
            if (selectedItem) {
                // Fetch stats from server
                try {
                    // We assume 0 required stock initially for new item selection to see Last Stock
                    const stats = await calculateRABLineStats(selectedItem.id, updatedLine.requiredStock || 0);

                    updateLine(id, 'itemId', value);
                    updateLine(id, 'sku', selectedItem.sku);
                    updateLine(id, 'itemName', selectedItem.name);
                    updateLine(id, 'lastStock', stats.lastStockSnapshot);
                    updateLine(id, 'unitPrice', stats.unitPrice);
                    // Recalculate based on current Required
                    const newReplenish = Math.max(0, (updatedLine.requiredStock || 0) - stats.lastStockSnapshot);
                    updateLine(id, 'replenishStock', newReplenish);
                    updateLine(id, 'totalCost', newReplenish * stats.unitPrice);
                } catch (e) {
                    console.error("Failed to fetch item stats", e);
                }
            } else {
                updateLine(id, 'itemId', '');
                updateLine(id, 'sku', '');
                updateLine(id, 'itemName', '');
            }
        } else if (field === 'requiredStock') {
            const qty = Number(value);
            updateLine(id, 'requiredStock', qty);
            const newReplenish = Math.max(0, qty - updatedLine.lastStock);
            updateLine(id, 'replenishStock', newReplenish);
            updateLine(id, 'totalCost', newReplenish * updatedLine.unitPrice);
        }
    };

    const calculateGrandTotal = () => {
        return lines.reduce((acc, line) => acc + line.totalCost, 0);
    };

    const handleSubmit = async () => {
        if (!user || !user.id) {
            alert("User not authenticated");
            return;
        }
        if (lines.length === 0) {
            alert("Please add at least one item.");
            return;
        }
        if (lines.some(l => !l.itemId)) {
            alert("Please select an Item for all lines.");
            return;
        }

        setIsLoading(true);
        const payload = {
            fiscalYear,
            fiscalMonth,
            currency,
            items: lines.map(l => ({
                itemId: l.itemId,
                requiredQty: l.requiredStock,
                notes: l.notes
            })),
            userId: user.id
        };

        const result = await createRAB(payload);
        setIsLoading(false);

        if (result.success) {
            alert("Budget Plan Created Successfully!");
            router.push('/budget');
        } else {
            alert("Failed: " + result.error);
        }
    };

    if (pageLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className="animate-fadeIn p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/budget" className="p-2 rounded-full hover:bg-[var(--color-bg-hover)]">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Create Budget Plan</h1>
                        <p className="text-[var(--color-text-secondary)]">Estimate and plan monthly budget</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                    >
                        {isLoading ? "Saving..." : <><Save size={18} /> Save Plan</>}
                    </button>
                </div>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Budget Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Fiscal Year</label>
                        <select
                            value={fiscalYear}
                            onChange={(e) => setFiscalYear(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Fiscal Month</label>
                        <select
                            value={fiscalMonth}
                            onChange={(e) => setFiscalMonth(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Currency</label>
                        <select
                            value={currency}
                            disabled
                            className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] opacity-70"
                        >
                            <option value="IDR">IDR (Indonesian Rupiah)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#FFF8E1] text-black font-bold uppercase border-b border-[var(--color-border)]">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">No</th>
                            <th className="px-4 py-3 w-32">SKU</th>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3 w-32 text-right">Required Stock</th>
                            <th className="px-4 py-3 w-28 text-right">Last Stock</th>
                            <th className="px-4 py-3 w-32 text-right">Replenish Stock</th>
                            <th className="px-4 py-3 w-32 text-right">Unit Price</th>
                            <th className="px-4 py-3 w-40 text-right">Total Cost</th>
                            <th className="px-4 py-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {lines.map((line, index) => (
                            <tr key={line.id} className="hover:bg-[var(--color-bg-hover)]">
                                <td className="px-4 py-2 text-center">{index + 1}</td>
                                <td className="px-4 py-2 text-[var(--color-text-muted)]">{line.sku}</td>
                                <td className="px-4 py-2">
                                    <select
                                        value={line.itemId}
                                        onChange={(e) => handleLineChange(line.id, 'itemId', e.target.value)}
                                        className="w-full p-1.5 rounded border border-[var(--color-border)] bg-transparent focus:ring-1 focus:ring-[var(--color-primary)]"
                                    >
                                        <option value="">Select Item...</option>
                                        {items.map(item => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <input
                                        type="number"
                                        min="0"
                                        value={line.requiredStock}
                                        onChange={(e) => handleLineChange(line.id, 'requiredStock', e.target.value)}
                                        className="w-full text-right p-1.5 rounded border border-[var(--color-border)] bg-transparent focus:ring-1 focus:ring-[var(--color-primary)]"
                                    />
                                </td>
                                <td className="px-4 py-2 text-right text-[var(--color-text-muted)]">
                                    {line.lastStock.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2 text-right font-medium">
                                    {line.replenishStock.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2 text-right text-[var(--color-text-muted)]">
                                    {line.unitPrice.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2 text-right font-bold text-[var(--color-primary)]">
                                    {line.totalCost.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button
                                        onClick={() => removeLine(line.id)}
                                        className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {/* Add Row Button Row */}
                        <tr>
                            <td colSpan={9} className="px-4 py-2">
                                <button
                                    onClick={addLine}
                                    className="flex items-center gap-2 text-[var(--color-primary)] font-medium hover:underline py-1"
                                >
                                    <Plus size={16} /> Add Item
                                </button>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-[#FFF8E1] font-bold border-t border-[var(--color-border)]">
                        <tr>
                            <td colSpan={3} className="px-4 py-3 text-right">TOTAL</td>
                            <td className="px-4 py-3 text-right">{lines.reduce((a, b) => a + (b.requiredStock || 0), 0).toLocaleString('id-ID')}</td>
                            <td colSpan={1}></td>
                            <td className="px-4 py-3 text-right">{lines.reduce((a, b) => a + b.replenishStock, 0).toLocaleString('id-ID')}</td>
                            <td colSpan={1}></td>
                            <td className="px-4 py-3 text-right text-lg">{calculateGrandTotal().toLocaleString('id-ID')}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
