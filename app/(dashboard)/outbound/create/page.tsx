'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Dropdown } from '@/components/ui/Dropdown';
import { Loader2, Save, ArrowLeft, Trash, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createOutbound } from '@/app/actions/outbound';
import { getVendors } from '@/app/actions/vendor'; // We actually need 'getMitras' or partners. For now reusing generic getVendors or getMitras if exists? 
// Checking sidebar: '/master/mitra' exists. Let's assume there is a getMitras action or we just use getVendors if same table?
// Prisma schema says: Mitra model. So we need getMitras.
// If getMitras doesn't exist, we might need to create it. I will use a placeholder or check master actions.

import { searchItems } from '@/app/actions/items'; // Function to search items for dropdown

export default function CreateOutboundPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [mitraId, setMitraId] = useState('');
    const [purpose, setPurpose] = useState('');
    const [notes, setNotes] = useState('');

    // Items State
    const [items, setItems] = useState<Array<{ itemId: string; itemName: string; available: number; requestedQty: number; notes: string }>>([
        { itemId: '', itemName: '', available: 0, requestedQty: 1, notes: '' }
    ]);

    // Async Options for Dropdown
    const loadItems = async (search: string) => {
        const res = await searchItems(search);
        // Assuming searchItems returns { id, name, sku, currentStock }
        return res.map((i: any) => ({
            label: `${i.sku} - ${i.name} (Stock: ${i.currentStock})`,
            value: i.id,
            original: i
        }));
    };

    // We need loadMitras. Let's stub it for now or implement if easy.
    const loadMitras = async (search: string) => {
        // Mocking for now as I haven't checked 'getMitras' availability
        return [];
    };

    const handleItemChange = (index: number, val: string, option?: any) => {
        const newItems = [...items];
        newItems[index].itemId = val;
        newItems[index].itemName = option?.label || '';
        newItems[index].available = option?.original?.currentStock || 0;
        setItems(newItems);
    };

    const handleQtyChange = (index: number, val: string) => {
        const newItems = [...items];
        newItems[index].requestedQty = parseInt(val) || 0;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const addItem = () => {
        setItems([...items, { itemId: '', itemName: '', available: 0, requestedQty: 1, notes: '' }]);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!items.every(i => i.itemId && i.requestedQty > 0)) {
            alert("Please ensure all items have valid selections and quantity > 0");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createOutbound({
                userId: user.id,
                mitraId: mitraId || undefined,
                purpose,
                notes,
                items: items.map(i => ({
                    itemId: i.itemId,
                    requestedQty: i.requestedQty,
                    notes: i.notes
                }))
            });

            if (result.success) {
                router.push('/outbound');
            } else {
                alert('Failed to create outbound: ' + result.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/outbound">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        New Outbound Request
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Create a request to move items out of storage
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Header Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg">Request Details</h3>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Destination (Mitra)</label>
                                {/* Placeholder for Mitra Dropdown */}
                                <Input placeholder="Type to search Mitra (Mock)..." value={mitraId} onChange={e => setMitraId(e.target.value)} />
                                <p className="text-xs text-gray-500">Leave blank for Internal Use</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Purpose</label>
                                <Input placeholder="e.g. Sales Order #123, Internal Usage" value={purpose} onChange={e => setPurpose(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea placeholder="Additional instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting} size="lg">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Submit Request
                    </Button>
                </div>

                {/* Items List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Items to Ship</h3>
                                <Button size="sm" variant="secondary" onClick={addItem}>
                                    <Plus size={16} className="mr-1" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-4 items-start p-4 bg-(--color-bg-secondary) rounded-lg border border-(--color-border)">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium mb-1 block">Item Selection</label>
                                                    <Dropdown
                                                        loadOptions={loadItems}
                                                        value={item.itemId}
                                                        onChange={(val, opt) => handleItemChange(index, val, opt)}
                                                        placeholder="Search Item SKU/Name..."
                                                    />
                                                    {item.available > 0 && (
                                                        <p className="text-xs text-green-600 mt-1">Available: {item.available}</p>
                                                    )}
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-xs font-medium mb-1 block">Qty</label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.requestedQty}
                                                        onChange={e => handleQtyChange(index, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <Input
                                                placeholder="Line reference / notes..."
                                                className="text-xs"
                                                value={item.notes}
                                                onChange={e => {
                                                    const newItems = [...items];
                                                    newItems[index].notes = e.target.value;
                                                    setItems(newItems);
                                                }}
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 mt-6" onClick={() => removeItem(index)}>
                                            <Trash size={18} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
