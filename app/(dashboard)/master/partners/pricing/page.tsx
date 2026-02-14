'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getPricingMatrix } from '@/app/actions/partner-prices';
import { formatCurrency } from '@/lib/utils';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui';
import { Card } from '@/components/ui/Card';

interface PricingData {
    partners: { id: string; code: string; name: string }[];
    items: { id: string; sku: string; name: string }[];
    priceMap: Record<string, number>;
    hppMap: Record<string, number>;
}

export default function PricingMatrixPage() {
    const router = useRouter();
    const [data, setData] = useState<PricingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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

    const filteredItems = data?.items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
    ) || [];

    if (loading) return <div className="p-8 text-center flex items-center justify-center h-96"><Loader2 className="animate-spin mr-2" /> Loading Pricing Matrix...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

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
                        <p className="text-(--color-text-muted)">View Only - Manage prices in Partner Detail page</p>
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
                                            const price = data.priceMap[key] || 0;
                                            return (
                                                <TableCell key={key} className="text-right border-l border-(--color-border) p-3 font-mono text-sm">
                                                    {price > 0 ? (
                                                        <span className="text-(--color-text-primary)">{formatCurrency(price)}</span>
                                                    ) : (
                                                        <span className="text-(--color-text-muted)">-</span>
                                                    )}
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
