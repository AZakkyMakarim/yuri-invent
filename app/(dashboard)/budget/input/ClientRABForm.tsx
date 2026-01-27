'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Save, ArrowLeft, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { NumberInput } from '@/components/ui/NumberInput';
import { Modal } from '@/components/ui/Modal';
import { getAllItems, createRAB, calculateRABLineStats } from '@/app/actions/rab';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

type RABLine = {
    id: string; // internal id for key
    itemId: string;
    sku: string;
    itemName: string;
    uomSymbol: string;
    requiredStock: number;
    lastStock: number;
    replenishStock: number;
    unitPrice: number;
    totalCost: number;
    notes: string;
};

export default function ClientRABForm() {
    const t = useTranslations('budget.form');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Header Data
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [fiscalMonth, setFiscalMonth] = useState(new Date().getMonth() + 1);
    const [currency, setCurrency] = useState('IDR');

    // Master Data
    const [items, setItems] = useState<{ id: string; sku: string; name: string; uom: { symbol: string } }[]>([]);

    // Lines
    const [lines, setLines] = useState<RABLine[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLine, setEditingLine] = useState<RABLine | null>(null);
    const [modalItemId, setModalItemId] = useState('');
    const [modalRequiredStock, setModalRequiredStock] = useState(0);

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
        setEditingLine(null);
        setModalItemId('');
        setModalRequiredStock(0);
        setIsModalOpen(true);
    };

    const openEditModal = (line: RABLine) => {
        setEditingLine(line);
        setModalItemId(line.itemId);
        setModalRequiredStock(line.requiredStock);
        setIsModalOpen(true);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleModalSave = async () => {
        if (!modalItemId) {
            alert(t('itemModal.alertSelect'));
            return;
        }

        const selectedItem = items.find(i => i.id === modalItemId);
        if (!selectedItem) return;

        // Calculate line stats
        const stats = await calculateRABLineStats(modalItemId, modalRequiredStock);

        const lineData: RABLine = {
            id: editingLine?.id || crypto.randomUUID(),
            itemId: modalItemId,
            sku: selectedItem.sku,
            itemName: selectedItem.name,
            uomSymbol: selectedItem.uom?.symbol || '',
            requiredStock: modalRequiredStock,
            lastStock: stats.lastStockSnapshot,
            replenishStock: Math.max(0, modalRequiredStock - stats.lastStockSnapshot),
            unitPrice: stats.unitPrice,
            totalCost: Math.max(0, modalRequiredStock - stats.lastStockSnapshot) * stats.unitPrice,
            notes: ''
        };

        if (editingLine) {
            // Update existing line
            setLines(lines.map(l => l.id === editingLine.id ? lineData : l));
        } else {
            // Add new line
            setLines([...lines, lineData]);
        }

        // Close modal and reset
        setIsModalOpen(false);
        setEditingLine(null);
        setModalItemId('');
        setModalRequiredStock(0);
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
                    // Safely access UOM with null checking
                    updateLine(id, 'uomSymbol', selectedItem.uom?.symbol || '');
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
                updateLine(id, 'uomSymbol', '');
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
            alert(t('alerts.userAuth'));
            return;
        }
        if (lines.length === 0) {
            alert(t('alerts.noItems'));
            return;
        }
        if (lines.some(l => !l.itemId)) {
            alert(t('alerts.allItems'));
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
            alert(t('alerts.success'));
            router.push('/budget');
        } else {
            alert(t('alerts.failed') + result.error);
        }
    };

    if (pageLoading) return <div className="p-8">{t('table.loading')}</div>;

    return (
        <div className="animate-fadeIn p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/budget" className="p-2 rounded-full hover:bg-(--color-bg-hover)">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{t('createTitle')}</h1>
                        <p className="text-(--color-text-secondary)">{t('description')}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-(--color-primary) text-white px-6 py-2 rounded-lg hover:bg-(--color-primary)/90 disabled:opacity-50"
                    >
                        {isLoading ? t('saving') : <><Save size={18} /> {t('save')}</>}
                    </button>
                </div>
            </div>

            <div className="bg-(--color-bg-card) rounded-xl border border-(--color-border) p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">{t('sections.period')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('sections.fiscalYear')}</label>
                        <SearchableDropdown
                            value={String(fiscalYear)}
                            onChange={(value) => setFiscalYear(Number(value))}
                            options={[2024, 2025, 2026, 2027].map(y => ({
                                value: String(y),
                                label: String(y)
                            }))}
                            placeholder={t('sections.selectYear')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('sections.fiscalMonth')}</label>
                        <SearchableDropdown
                            value={String(fiscalMonth)}
                            onChange={(value) => setFiscalMonth(Number(value))}
                            options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                                value: String(m),
                                label: new Date(0, m - 1).toLocaleString(locale === 'id' ? 'id-ID' : 'default', { month: 'long' })
                            }))}
                            placeholder={t('sections.selectMonth')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('sections.currency')}</label>
                        <SearchableDropdown
                            value={currency}
                            onChange={(value) => setCurrency(value as string)}
                            options={[
                                { value: 'IDR', label: 'IDR (Indonesian Rupiah)' }
                            ]}
                            placeholder="Select Currency..." // Hardcoded as it's just one option for now, or translate
                            disabled
                        />
                    </div>
                </div>
            </div>

            <div className="bg-(--color-bg-card) rounded-xl border border-(--color-border) overflow-x-auto shadow-lg">
                <table className="w-full text-left text-sm min-w-max">
                    <thead className="bg-(--color-bg-secondary) border-b border-(--color-border)">
                        <tr>
                            <th className="px-4 py-4 w-12 text-center font-bold text-xs tracking-wide">{t('table.no')}</th>
                            <th className="px-4 py-4 w-72 font-bold text-xs tracking-wide">{t('table.itemName')}</th>
                            <th className="px-4 py-4 w-40 text-right font-bold text-xs tracking-wide">{t('table.required')}</th>
                            <th className="px-4 py-4 w-28 text-right font-bold text-xs tracking-wide">{t('table.lastStock')}</th>
                            <th className="px-4 py-4 w-36 text-right font-bold text-xs tracking-wide">{t('table.replenish')}</th>
                            <th className="px-4 py-4 w-32 text-right font-bold text-xs tracking-wide">{t('table.unitPrice')}</th>
                            <th className="px-4 py-4 w-40 text-right font-bold text-xs tracking-wide">{t('table.totalCost')}</th>
                            <th className="px-4 py-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-border)">
                        {lines.map((line, index) => (
                            <tr key={line.id} className="hover:bg-(--color-bg-hover) transition-all">
                                <td className="px-4 py-3 text-center font-medium text-(--color-text-secondary)">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <div className="max-w-xs truncate font-medium">
                                        {line.itemName || <span className="text-(--color-text-muted) italic">Not selected</span>}
                                    </div>
                                    {line.sku && (
                                        <div className="text-xs text-(--color-text-muted) truncate">{line.sku}</div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className="font-mono font-medium">
                                            {line.requiredStock > 0 ? line.requiredStock.toLocaleString('id-ID') : '-'}
                                        </span>
                                        {line.uomSymbol && (
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                                {line.uomSymbol}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-(--color-text-muted) font-mono text-sm">
                                    {line.lastStock.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400 font-mono text-sm">
                                    {line.replenishStock.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-3 text-right text-(--color-text-secondary) font-mono text-sm">
                                    {formatCurrency(line.unitPrice)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-lg text-blue-600 dark:text-blue-400 font-mono">
                                    {formatCurrency(line.totalCost)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => openEditModal(line)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            title="Edit item"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => removeLine(line.id)}
                                            className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                                            title="Remove Item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {/* Add Row Button Row */}
                        <tr>
                            <td colSpan={8} className="px-4 py-4 bg-(--color-bg-secondary)">
                                <div className="flex justify-center">
                                    <button
                                        onClick={addLine}
                                        className="flex items-center gap-2 text-(--color-primary) font-semibold hover:text-(--color-primary)/80 transition-colors py-2 px-3 rounded-lg hover:bg-(--color-bg-hover)"
                                    >
                                        <Plus size={18} /> {t('table.addItem')}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-(--color-bg-secondary) border-t-2 border-(--color-border)">
                        <tr>
                            <td colSpan={2} className="px-4 py-4 text-right font-bold tracking-wide">{t('table.total')}</td>
                            <td className="px-4 py-4 text-right font-bold font-mono">{lines.reduce((a, b) => a + (b.requiredStock || 0), 0).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-4 text-right font-bold font-mono">{lines.reduce((a, b) => a + b.lastStock, 0).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-4 text-right font-bold text-green-700 dark:text-green-300 font-mono">{lines.reduce((a, b) => a + b.replenishStock, 0).toLocaleString('id-ID')}</td>
                            <td></td>
                            <td className="px-4 py-4 text-right text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">{formatCurrency(calculateGrandTotal())}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Add/Edit Item Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingLine(null);
                    setModalItemId('');
                    setModalRequiredStock(0);
                }}
                title={editingLine ? t('itemModal.editTitle') : t('itemModal.addTitle')}
            >
                <div className="space-y-4">
                    {/* Item Selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('itemModal.itemLabel')}</label>
                        <SearchableDropdown
                            value={modalItemId}
                            onChange={(value) => setModalItemId(value as string)}
                            options={items.map(item => ({
                                value: item.id,
                                label: item.name,
                                subtitle: `SKU: ${item.sku}`
                            }))}
                            placeholder={t('itemModal.selectItemPlaceholder')}
                        />
                    </div>

                    {/* Required Stock Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            {t('itemModal.requiredStockLabel')}
                            {modalItemId && items.find(i => i.id === modalItemId)?.uom?.symbol && (
                                <span className="ml-2 text-xs text-(--color-text-muted)">
                                    ({items.find(i => i.id === modalItemId)?.uom?.symbol})
                                </span>
                            )}
                        </label>
                        <NumberInput
                            value={modalRequiredStock}
                            onChange={(value) => setModalRequiredStock(value)}
                            min={0}
                            allowDecimal={false}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                setEditingLine(null);
                                setModalItemId('');
                                setModalRequiredStock(0);
                            }}
                            className="px-4 py-2 border border-(--color-border) rounded-lg hover:bg-(--color-bg-hover) transition-colors"
                        >
                            {t('itemModal.cancel')}
                        </button>
                        <button
                            onClick={handleModalSave}
                            className="px-4 py-2 bg-(--color-primary) text-white rounded-lg hover:bg-(--color-primary)/90 transition-colors flex items-center gap-2"
                        >
                            <Save size={16} />
                            {editingLine ? t('itemModal.update') : t('itemModal.add')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

