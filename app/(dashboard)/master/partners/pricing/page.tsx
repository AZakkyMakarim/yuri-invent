'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { getPricingMatrix, updatePricingMatrix } from '@/app/actions/partner-prices';
import { formatCurrency } from '@/lib/utils';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
} from '@/components/ui';
import { Card, CardContent } from '@/components/ui/Card';

interface PricingData {
    partners: { id: string; code: string; name: string }[];
    items: { id: string; sku: string; name: string }[];
    priceMap: Record<string, number>;
    hppMap: Record<string, number>;
}

export default function PricingMatrixPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [data, setData] = useState<PricingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});

    // Virtualized or just regular render? Regular for now, optimize if slow

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getPricingMatrix();
        if (res.success) {
            setData(res.data as PricingData);
        }
        setLoading(false);
    };

    const handlePriceChange = (partnerId: string, itemId: string, value: string) => {
        const price = parseFloat(value) || 0;
        const key = `${partnerId}_${itemId}`;
        setEditedPrices(prev => ({
            ...prev,
            [key]: price
        }));
    };

    const handleSave = async () => {
        setSaving(true);

        const updates = Object.entries(editedPrices).map(([key, price]) => {
            const [partnerId, itemId] = key.split('_');
            return { partnerId, itemId, price };
        });

        if (updates.length > 0) {
            const res = await updatePricingMatrix(updates);
            if (res.success) {
                toast({
                    title: "Success",
                    description: `Updated ${updates.length} prices successfully`,
                    variant: 'success'
                });
                setEditedPrices({});
                // Reload data to ensure consistency? Or just trust local state?
                // Better to simple reload or update local map source of truth
                await loadData();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to update prices",
                    variant: 'destructive'
                });
            }
        } else {
            toast({
                title: "Info",
                description: "No changes to save",
            });
        }

        setSaving(false);
    };

    const isModified = (partnerId: string, itemId: string) => {
        return editedPrices.hasOwnProperty(`${partnerId}_${itemId}`);
    };

    const getPriceDisplay = (partnerId: string, itemId: string) => {
        const key = `${partnerId}_${itemId}`;
        if (editedPrices.hasOwnProperty(key)) {
            return editedPrices[key];
        }
        return data?.priceMap[key] || 0;
    };

    const filteredItems = data?.items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
    ) || [];

    if (loading) return <div className="p-8 text-center flex items-center justify-center h-96"><Loader2 className="animate-spin mr-2" /> Loading Pricing Matrix...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

    const hasChanges = Object.keys(editedPrices).length > 0;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                            Partner Pricing Matrix
                        </h1>
                        <p className="text-(--color-text-muted)">Manage prices for all items across all partners</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2 bg-(--color-bg-card) p-2 rounded-lg border border-(--color-border) shadow-sm">
                        <Search className="h-4 w-4 text-(--color-text-muted)" />
                        <Input
                            placeholder="Search items..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border-0 focus-visible:ring-0 w-64 h-8 bg-transparent"
                        />
                    </div>
                    <Button onClick={handleSave} disabled={saving || !hasChanges}>
                        {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes ({Object.keys(editedPrices).length})
                    </Button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col border-(--color-border) bg-(--color-bg-card)">
                <div className="flex-1 relative">
                    <Table>
                        <TableHeader className="sticky top-0 bg-(--color-bg-card) z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[50px] text-center sticky left-0 bg-(--color-bg-card) z-20 border-r border-(--color-border)">No</TableHead>
                                <TableHead className="w-[120px] sticky left-[50px] bg-(--color-bg-card) z-20 border-r border-(--color-border)">SKU</TableHead>
                                <TableHead className="w-[300px] sticky left-[170px] bg-(--color-bg-card) z-20 border-r border-(--color-border) shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Item Name</TableHead>
                                <TableHead className="w-[120px] text-right bg-(--color-bg-tertiary)">HPP (Est)</TableHead>
                                {data.partners.map(partner => (
                                    <TableHead key={partner.id} className="min-w-[150px] text-right font-bold text-(--color-text-primary) border-l border-(--color-border)">
                                        {partner.name}
                                        <div className="text-xs font-normal text-(--color-text-muted)">{partner.code}</div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4 + data.partners.length} className="text-center h-24 text-(--color-text-muted)">
                                        No items found matching "{search}"
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <TableRow key={item.id} className="hover:bg-(--color-bg-hover)">
                                        <TableCell className="text-center sticky left-0 bg-(--color-bg-card) z-10 border-r border-(--color-border) text-(--color-text-muted) text-xs">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs sticky left-[50px] bg-(--color-bg-card) z-10 border-r border-(--color-border) text-(--color-text-secondary)">
                                            {item.sku}
                                        </TableCell>
                                        <TableCell className="font-medium sticky left-[170px] bg-(--color-bg-card) z-10 border-r border-(--color-border) shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] text-(--color-text-primary)">
                                            {item.name}
                                        </TableCell>
                                        <TableCell className="text-right text-(--color-text-muted) bg-(--color-bg-tertiary)/50">
                                            {formatCurrency(data.hppMap[item.id] || 0)}
                                        </TableCell>
                                        {data.partners.map(partner => {
                                            const key = `${partner.id}_${item.id}`;
                                            const modified = isModified(partner.id, item.id);
                                            return (
                                                <TableCell key={key} className={`p-1 border-l border-(--color-border) ${modified ? 'bg-(--color-primary)/10' : ''}`}>
                                                    <Input
                                                        type="number"
                                                        className={`text-right h-8 border-transparent hover:border-(--color-border-hover) focus:border-(--color-primary) ${modified ? 'font-bold text-(--color-primary)' : 'text-(--color-text-primary)'}`}
                                                        value={getPriceDisplay(partner.id, item.id)}
                                                        onChange={e => handlePriceChange(partner.id, item.id, e.target.value)}
                                                        onFocus={e => e.target.select()}
                                                    />
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
