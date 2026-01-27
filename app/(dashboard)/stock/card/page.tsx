'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    Button,
    SearchableDropdown,
    Badge,
} from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import { formatDate, formatDateTime, formatNumber, formatCurrency } from '@/lib/format';
import { Package, Printer, Download } from 'lucide-react';

interface StockReportData {
    item: {
        name: string;
        sku: string;
        uom: string;
        minStock: number;
        maxStock: number;
        category: string;
    };
    period: {
        month: number;
        year: number;
        startDate: string;
        endDate: string;
    };
    openingStock: number;
    movements: StockMovement[];
}

interface StockMovement {
    id: string;
    transactionDate: string;
    movementType: string;
    quantityChange: number;
    inbound?: { grnNumber: string };
    outbound?: { outboundCode: string };
    stockAdjustment?: { adjustmentCode: string };
    return?: { returnCode: string };
}

interface ItemOption {
    label: string;
    value: string;
}

export default function StockCardPage() {
    const tCommon = useTranslations('common');

    // Filters
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Category Filter
    const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    // Data
    const [reportData, setReportData] = useState<StockReportData | null>(null);
    const [loading, setLoading] = useState(false);

    // Item Search
    const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Prevent caching to ensure we get latest categories
                const res = await apiFetch<any>('/categories?limit=100', { cache: 'no-store' });
                console.log('Categories API response:', res);
                if (res && res.data) {
                    const options = res.data.map((c: any) => ({
                        label: c.name,
                        value: c.id
                    }));
                    options.unshift({ label: 'All Categories', value: '' });
                    setCategories(options);
                } else {
                    console.error('Categories response invalid:', res);
                }
            } catch (e) {
                console.error('Error fetching categories:', e);
            }
        };
        fetchCategories();
    }, []);

    // Initial Item Fetch (or Search)
    const fetchItems = useCallback(async (search: string = '') => {
        setLoadingItems(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '100');
            if (search) params.set('search', search);
            if (selectedCategoryId) params.set('categoryIds', selectedCategoryId);

            // Using existing items API which returns standard paginated response
            const res = await apiFetch<any>(`/items?${params.toString()}`);
            const options = res.data.map((i: any) => ({
                label: `${i.sku} - ${i.name}`,
                value: i.id
            }));
            setItemOptions(options);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingItems(false);
        }
    }, [selectedCategoryId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Fetch Report
    const fetchReport = useCallback(async () => {
        if (!selectedItemId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('itemId', selectedItemId);
            params.set('month', selectedMonth.toString());
            params.set('year', selectedYear.toString());

            const data = await apiFetch<StockReportData>(`/stock/report?${params.toString()}`);
            setReportData(data);
        } catch (error) {
            console.error('Error fetching report:', error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedItemId, selectedMonth, selectedYear]);

    useEffect(() => {
        if (selectedItemId) {
            fetchReport();
        } else {
            setReportData(null);
        }
    }, [fetchReport, selectedItemId, selectedMonth, selectedYear]);

    // Process Transaction Rows
    const transactionRows = useMemo(() => {
        if (!reportData) return [];

        let currentBalance = reportData.openingStock;

        return reportData.movements.map((movement) => {
            const inQty = movement.quantityChange > 0 ? movement.quantityChange : 0;
            const outQty = movement.quantityChange < 0 ? Math.abs(movement.quantityChange) : 0;

            // Update balance for this row
            currentBalance = currentBalance + inQty - outQty;

            // Determine reference code
            const refCode =
                movement.inbound?.grnNumber ||
                movement.outbound?.outboundCode ||
                movement.stockAdjustment?.adjustmentCode ||
                movement.return?.returnCode ||
                '-';

            return {
                id: movement.id,
                date: new Date(movement.transactionDate),
                label: formatDateTime(movement.transactionDate, 'id-ID'),
                in: inQty > 0 ? inQty : null,
                out: outQty > 0 ? outQty : null,
                balance: currentBalance,
                ref: refCode
            };
        });
    }, [reportData]);


    return (
        <div className="animate-fadeIn space-y-6 pb-10">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-4 bg-(--color-bg-card) rounded-lg border border-(--color-border) shadow-sm">
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium mb-1">Kategori</label>
                        <select
                            className="w-full p-2 border border-(--color-border) rounded-md bg-(--color-bg-card) text-(--color-text-primary)"
                            value={selectedCategoryId}
                            onChange={(e) => {
                                setSelectedCategoryId(e.target.value);
                                setSelectedItemId(''); // Reset item when category changes
                            }}
                        >
                            {categories.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Item Picker */}
                    <div className="w-full md:w-80">
                        <label className="block text-sm font-medium mb-1">Barang (Item)</label>
                        <SearchableDropdown
                            options={itemOptions}
                            value={selectedItemId}
                            onChange={(val) => setSelectedItemId(val as string)}
                            placeholder="Cari Barang (SKU / Nama)..."
                        />
                    </div>

                    {/* Month Picker */}
                    <div className="w-1/2 md:w-40">
                        <label className="block text-sm font-medium mb-1">Bulan</label>
                        <select
                            className="w-full p-2 border border-(--color-border) rounded-md bg-(--color-bg-card) text-(--color-text-primary)"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Year Picker */}
                    <div className="w-1/3 md:w-32">
                        <label className="block text-sm font-medium mb-1">Tahun</label>
                        <select
                            className="w-full p-2 border border-(--color-border) rounded-md bg-(--color-bg-card) text-(--color-text-primary)"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => window.print()}>
                        <Printer size={16} className="mr-2" /> Cetak
                    </Button>
                </div>
            </div>

            {reportData ? (
                <div className="space-y-4">
                    {/* Item Info Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-(--color-bg-card) rounded-lg border border-(--color-border)">
                        <div>
                            <p className="text-sm text-(--color-text-muted)">Barang</p>
                            <p className="font-bold text-lg">{reportData.item.name}</p>
                            <p className="text-xs font-mono">{reportData.item.sku}</p>
                        </div>
                        <div>
                            <p className="text-sm text-(--color-text-muted)">UOM / Kategori</p>
                            <p className="font-medium">{reportData.item.uom} <span className="text-(--color-text-muted)">/ {reportData.item.category}</span></p>
                        </div>
                        <div>
                            <p className="text-sm text-(--color-text-muted)">Stok Min / Max</p>
                            <p className="font-medium">{reportData.item.minStock} / {reportData.item.maxStock}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md border border-blue-100 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold">Stok Awal (Opening)</p>
                            <p className="font-bold text-2xl text-blue-700 dark:text-blue-400">{formatNumber(reportData.openingStock)}</p>
                        </div>
                    </div>

                    {/* Transaction Log Table */}
                    <div className="border border-(--color-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-900 border-b border-(--color-border)">
                                <tr>
                                    <th className="p-3 text-left font-semibold w-12 cursor-default">No</th>
                                    <th className="p-3 text-left font-semibold cursor-default">Tanggal & Waktu</th>
                                    <th className="p-3 text-right font-semibold border-l border-r border-(--color-border) bg-green-50/50 dark:bg-green-900/10 cursor-default">Masuk</th>
                                    <th className="p-3 text-right font-semibold border-r border-(--color-border) bg-red-50/50 dark:bg-red-900/10 cursor-default">Keluar</th>
                                    <th className="p-3 text-right font-semibold border-r border-(--color-border) bg-blue-50/50 dark:bg-blue-900/10 cursor-default">Sisa (Balance)</th>
                                    <th className="p-3 text-right font-semibold cursor-default">Ket. (Ref)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Opening Stock Row - Optional but helpful context */}
                                <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-(--color-border)">
                                    <td className="p-2 pl-3 text-(--color-text-muted)">-</td>
                                    <td className="p-2 font-medium italic text-(--color-text-muted)">Stok Awal Bulan</td>
                                    <td className="p-2 text-right text-(--color-text-muted)">-</td>
                                    <td className="p-2 text-right text-(--color-text-muted)">-</td>
                                    <td className="p-2 text-right font-bold text-blue-700 dark:text-blue-400">{formatNumber(reportData.openingStock)}</td>
                                    <td className="p-2 text-xs text-(--color-text-muted)">-</td>
                                </tr>

                                {transactionRows.length === 0 ? (
                                    <tr className="border-b border-(--color-border)">
                                        <td colSpan={6} className="p-8 text-center text-(--color-text-muted)">Tidak ada transaksi bulan ini</td>
                                    </tr>
                                ) : (
                                    transactionRows.map((row, index) => (
                                        <tr key={row.id} className="border-b border-(--color-border) hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                            <td className="p-2 pl-3 text-(--color-text-muted)">{index + 1}</td>
                                            <td className="p-2 whitespace-nowrap">{row.label}</td>
                                            <td className="p-2 text-right font-medium text-green-600 bg-green-50/20">{row.in ? formatNumber(row.in) : '-'}</td>
                                            <td className="p-2 text-right font-medium text-red-600 bg-red-50/20">{row.out ? formatNumber(row.out) : '-'}</td>
                                            <td className="p-2 text-right font-bold bg-blue-50/20">{formatNumber(row.balance)}</td>
                                            <td className="p-2 text-xs text-right font-mono text-(--color-text-secondary)">
                                                {row.ref}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-(--color-border) rounded-lg p-8">
                    <Package size={48} className="text-(--color-text-muted) mb-4" />
                    <p className="text-lg font-medium">Pilih Barang untuk melihat Kartu Stok</p>
                    <p className="text-(--color-text-muted) text-sm mt-1">Gunakan filter di atas untuk memilih dan memfilter barang serta periode.</p>
                </div>
            )}
        </div>
    );
}
