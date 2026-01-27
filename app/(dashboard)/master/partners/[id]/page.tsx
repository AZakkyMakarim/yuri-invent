'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getPartner } from '@/app/actions/partners';
import { getPartnerPrices, updatePartnerPrices } from '@/app/actions/partner-prices';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export default function PartnerDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const [partner, setPartner] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [partnerRes, pricesRes] = await Promise.all([
                getPartner(params.id),
                getPartnerPrices(params.id)
            ]);

            if (partnerRes.success) {
                setPartner(partnerRes.data);
            }
            if (pricesRes.success) {
                setItems(pricesRes.data as any[]);
            }
            setLoading(false);
        };
        loadData();
    }, [params.id]);

    const handlePriceChange = (itemId: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;
        setItems(items.map(item =>
            item.itemId === itemId ? { ...item, price } : item
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        const updates = items.map(item => ({
            itemId: item.itemId,
            price: item.price
        }));

        const res = await updatePartnerPrices(params.id, updates);
        setSaving(false);

        if (res.success) {
            toast({
                title: "Success",
                description: "Prices updated successfully",
                variant: 'success'
            });
        } else {
            toast({
                title: "Error",
                description: "Failed to update prices",
                variant: 'destructive'
            });
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-(--color-text-muted)">Loading...</div>;
    if (!partner) return <div className="p-8 text-center text-(--color-danger)">Partner not found</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                            {partner.name}
                        </h1>
                        <p className="text-(--color-text-secondary)">{partner.code} • {partner.contactName || 'No Contact'}</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Prices
                </Button>
            </div>

            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-(--color-text-primary)">Item Pricing</h2>
                        <Input
                            placeholder="Search items..."
                            className="max-w-xs"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="border border-(--color-border) rounded-md max-h-[600px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">SKU</TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="w-[100px]">UOM</TableHead>
                                    <TableHead className="w-[200px] text-right">Selling Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map(item => (
                                    <TableRow key={item.itemId}>
                                        <TableCell className="font-mono text-xs text-(--color-text-secondary)">{item.sku}</TableCell>
                                        <TableCell className="font-medium text-(--color-text-primary)">{item.name}</TableCell>
                                        <TableCell className="text-(--color-text-secondary)">{item.uom}</TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="text-right h-8"
                                                value={item.price}
                                                onChange={e => handlePriceChange(item.itemId, e.target.value)}
                                                onFocus={e => e.target.select()}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
