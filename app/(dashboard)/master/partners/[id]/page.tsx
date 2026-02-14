'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Edit, MapPin, Phone, Mail, User, CreditCard, Package, Save, Loader2, TableProperties, History, Building } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getPartner, getPartnerSalesHistory } from '@/app/actions/partners';
import { getPartnerPrices, updatePartnerPrices } from '@/app/actions/partner-prices';
import { formatDate } from '@/lib/format';

interface Partner {
    id: string;
    code: string;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    bankName: string | null;
    bankBranch?: string | null;
    bankAccount: string | null;
    isActive: boolean;
}

interface PriceItem {
    itemId: string;
    sku: string;
    name: string;
    uom: string;
    price: number;
    hpp: number;
}

interface SalesHistoryItem {
    id: string;
    date: string;
    code: string;
    status: string;
    itemCount: number;
    notes: string | null;
    items: {
        name: string;
        sku: string;
        qty: number;
    }[];
}

export default function PartnerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const partnerId = params.id as string;

    const [partner, setPartner] = useState<Partner | null>(null);
    const [prices, setPrices] = useState<PriceItem[]>([]);
    const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);

    // Loading States
    const [loading, setLoading] = useState(true);
    const [pricesLoading, setPricesLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState('pricing');
    const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
    const [markupPercentage, setMarkupPercentage] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await getPartner(partnerId);
        if (res.success) {
            setPartner(res.data as Partner);
        } else {
            router.push('/master/partners');
        }
        setLoading(false);
    }, [partnerId, router]);

    const fetchPrices = useCallback(async () => {
        setPricesLoading(true);
        const res = await getPartnerPrices(partnerId);
        if (res.success) {
            setPrices(res.data as PriceItem[]);
        }
        setPricesLoading(false);
    }, [partnerId]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        const res = await getPartnerSalesHistory(partnerId);
        if (res.success) {
            setSalesHistory(res.data as any);
        }
        setHistoryLoading(false);
    }, [partnerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activeTab === 'pricing') {
            fetchPrices();
        } else if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchPrices, fetchHistory]);

    const handlePriceChange = (itemId: string, value: string) => {
        const price = parseFloat(value) || 0;
        setEditedPrices(prev => ({
            ...prev,
            [itemId]: price
        }));
    };

    const handleSavePrices = async () => {
        setSaving(true);
        const updates = Object.entries(editedPrices).map(([itemId, price]) => ({
            itemId,
            price
        }));

        if (updates.length > 0) {
            const res = await updatePartnerPrices(partnerId, updates);
            if (res.success) {
                toast({
                    title: "Success",
                    description: "Prices updated successfully",
                    variant: "success"
                });
                setEditedPrices({});
                fetchPrices();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to update prices",
                    variant: "destructive"
                });
            }
        }
        setSaving(false);
    };

    const handleApplyMarkup = () => {
        const percentage = parseFloat(markupPercentage);
        if (isNaN(percentage)) return;

        const newPrices: Record<string, number> = {};
        prices.forEach(item => {
            const hpp = item.hpp || 0;
            const markupAmount = hpp * (percentage / 100);
            const sellingPrice = Math.ceil(hpp + markupAmount); // Round up to nearest integer
            newPrices[item.itemId] = sellingPrice;
        });

        setEditedPrices(newPrices);
        toast({
            title: "Markup Applied",
            description: `Applied ${percentage}% markup to all items based on HPP.`,
            variant: "default"
        });
    };

    const hasChanges = Object.keys(editedPrices).length > 0;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-(--color-primary)" size={32} />
                    <p className="text-(--color-text-muted)">Loading partner details...</p>
                </div>
            </div>
        );
    }

    if (!partner) return null;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push('/master/partners')} className="mb-4">
                    <ArrowLeft size={16} className="mr-2" /> Back to Partners
                </Button>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent mb-2">
                        {partner.name}
                    </h1>
                    <Badge variant={partner.isActive ? 'success' : 'neutral'}>
                        {partner.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Vendor Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-(--color-border) flex justify-between items-center bg-(--color-bg-secondary)">
                            <h3 className="font-semibold flex items-center gap-2">
                                Partner Details
                            </h3>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Code */}
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-indigo-500 bg-opacity-10 rounded-lg shadow-md">
                                    <Building2 size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Kode Mitra</div>
                                    <div className="text-sm font-medium">{partner.code || "-"}</div>
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg shadow-md">
                                    <User size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Contact Person</div>
                                    <div className="text-sm font-medium">{partner.contactName || "-"}</div>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-500 bg-opacity-10 rounded-lg shadow-md">
                                    <Phone size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Phone Number</div>
                                    <div className="text-sm font-medium">{partner.phone || "-"}</div>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-500 bg-opacity-10 rounded-lg shadow-md">
                                    <Mail size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-(--color-text-muted) mb-1">Email Address</div>
                                    <div className="text-sm font-medium break-all">{partner.email || "-"}</div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="border-t border-(--color-border) pt-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        <MapPin size={16} className="text-(--color-text-muted)" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-(--color-text-muted) mb-1">Address</div>
                                        <p className="text-sm leading-relaxed">{partner.address || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Banking */}
                            <div className="border-t border-(--color-border) pt-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        <CreditCard size={16} className="text-(--color-text-muted)" />
                                    </div>
                                    <div className="w-full">
                                        <div className="text-xs text-(--color-text-muted) mb-2">Banking Details</div>
                                        <div className="bg-(--color-bg-tertiary) p-3 rounded-lg text-sm">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-(--color-text-muted)">Bank</span>
                                                <span className="font-medium">{partner.bankName || "-"}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-(--color-text-muted)">Branch</span>
                                                <span className="font-medium">{partner.bankBranch || "-"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-(--color-text-muted)">Nomor Rekening</span>
                                                <span className="font-mono">{partner.bankAccount || "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Dynamic Tabs */}
                <div className="lg:col-span-2">
                    <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl shadow-sm min-h-[600px] flex flex-col">
                        <Tabs
                            tabs={[
                                { id: 'pricing', label: 'Pricing Matrix', icon: <TableProperties size={16} /> },
                                { id: 'history', label: 'Sales History', icon: <History size={16} /> }
                            ]}
                            activeTab={activeTab}
                            onChange={setActiveTab}
                            className="flex flex-col h-full"
                        >
                            {(currentTab) => (
                                <div className="p-6 flex-1">
                                    {/* Pricing Matrix Tab */}
                                    {currentTab === 'pricing' && (
                                        <div className="space-y-4">
                                            <div className="bg-(--color-bg-tertiary) p-4 rounded-lg flex flex-wrap items-center gap-4 border border-(--color-border)">
                                                <div className="space-y-2 flex-1 min-w-[200px]">
                                                    <label className="text-sm font-medium">Bulk Markup (%)</label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g. 20"
                                                            value={markupPercentage}
                                                            onChange={(e) => setMarkupPercentage(e.target.value)}
                                                        />
                                                        <Button variant="secondary" onClick={handleApplyMarkup} disabled={!markupPercentage}>
                                                            Apply
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-(--color-text-muted)">
                                                        Sets selling price = HPP + (HPP × Markup %). Overwrites all current edits.
                                                    </p>
                                                </div>
                                                <div className="flex-none">
                                                    <Button onClick={handleSavePrices} disabled={saving || !hasChanges}>
                                                        {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                                        Save Changes ({Object.keys(editedPrices).length})
                                                    </Button>
                                                </div>
                                            </div>

                                            {pricesLoading ? (
                                                <div className="text-center py-12 text-(--color-text-muted)">Loading prices...</div>
                                            ) : (
                                                <div className="border border-(--color-border) rounded-lg overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-(--color-bg-secondary)">
                                                            <TableRow>
                                                                <TableHead className="w-[40px]">No</TableHead>
                                                                <TableHead className="w-[120px]">SKU</TableHead>
                                                                <TableHead>Item Name</TableHead>
                                                                <TableHead className="w-[100px]">UOM</TableHead>
                                                                <TableHead className="w-[120px] text-right">HPP (Ref)</TableHead>
                                                                <TableHead className="w-[200px] text-right">Selling Price</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {prices.map((item, index) => {
                                                                const isModified = editedPrices.hasOwnProperty(item.itemId);
                                                                const currentPrice = isModified ? editedPrices[item.itemId] : item.price;
                                                                const hpp = item.hpp || 0;

                                                                return (
                                                                    <TableRow key={item.itemId} className={isModified ? 'bg-(--color-bg-primary)/5' : ''}>
                                                                        <TableCell>
                                                                            {index + 1}
                                                                        </TableCell>
                                                                        <TableCell className="font-mono text-xs text-(--color-text-muted)">
                                                                            {item.sku}
                                                                        </TableCell>
                                                                        <TableCell className="font-medium">
                                                                            {item.name}
                                                                        </TableCell>
                                                                        <TableCell className="text-sm text-(--color-text-muted)">
                                                                            {item.uom}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-mono text-xs text-(--color-text-muted)">
                                                                            {formatCurrency(item.hpp || 0)}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <Input
                                                                                type="number"
                                                                                className={`text-right h-9 ${isModified ? 'border-(--color-primary) ring-1 ring-(--color-primary)' : ''}`}
                                                                                value={currentPrice}
                                                                                onChange={(e) => handlePriceChange(item.itemId, e.target.value)}
                                                                                onFocus={(e) => e.target.select()}
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sales History Tab */}
                                    {currentTab === 'history' && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold">Sales History</h3>
                                            </div>

                                            {historyLoading ? (
                                                <div className="text-center py-12 text-(--color-text-muted)">Loading history...</div>
                                            ) : salesHistory.length === 0 ? (
                                                <div className="text-center py-12 text-(--color-text-muted)">
                                                    <Package size={48} className="mx-auto mb-4 opacity-40" />
                                                    <h3 className="text-lg font-medium mb-2">No Sales History</h3>
                                                    <p className="text-sm">No outbound transactions found for this partner.</p>
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Outbound Code</TableHead>
                                                            <TableHead>Items</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {salesHistory.map((sale) => (
                                                            <TableRow key={sale.id}>
                                                                <TableCell>{formatDate(sale.date)}</TableCell>
                                                                <TableCell className="font-mono text-sm">{sale.code}</TableCell>
                                                                <TableCell>
                                                                    <div className="text-sm">
                                                                        <span className="font-medium">{sale.itemCount} items</span>
                                                                        <div className="text-xs text-(--color-text-muted) truncate max-w-[200px]">
                                                                            {sale.items.map(i => i.name).join(', ')}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="info" className="text-xs">
                                                                        {sale.status}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
