'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Dropdown } from '@/components/ui/Dropdown';
import { Loader2, Save, ArrowLeft, Trash, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createReturn } from '@/app/actions/return';
import { searchPurchaseRequests, getPurchaseRequestById } from '@/app/actions/purchase'; // Need to verify/ensure these exist
import { ReturnReason } from '@prisma/client';

export default function CreateReturnPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [purchaseRequestId, setPurchaseRequestId] = useState('');
    const [vendorName, setVendorName] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [reason, setReason] = useState<ReturnReason>('DAMAGED');
    const [notes, setNotes] = useState('');

    // Items State
    const [items, setItems] = useState<Array<{ itemId: string; itemName: string; maxQty: number; quantity: number; unitPrice: number; reason: string }>>([]);

    // Load PR Details when selected
    useEffect(() => {
        if (!purchaseRequestId) {
            setItems([]);
            setVendorName('');
            setVendorId('');
            return;
        }

        async function loadPR() {
            // We assume getPurchaseRequestById returns items with vendor
            const res = await getPurchaseRequestById(purchaseRequestId);
            if (res.success && res.data) {
                setVendorName(res.data.vendor.name);
                setVendorId(res.data.vendor.id);
                // Pre-fill items from PR? Or let user add them?
                // Usually returns are partial. Let's load potential items but require selection.
                // Actually, helpful to load them as "available to return".
                // But PR items show *requested* qty. We need *received* qty ideally (from Inbound).
                // Schema: Inbound is related to PR.
                // Complexity: A PR might have multiple Inbounds.
                // determining exact "returnable" qty is hard without tracking inbound batches.
                // For now: List items from PR, maxQty is PR quantity (simplification).

                const prItems = res.data.items.map((i: any) => ({
                    itemId: i.itemId,
                    itemName: i.item.name,
                    maxQty: i.quantity, // Should be receivedQty but schema PRItem has .quantity
                    quantity: 0,
                    unitPrice: i.unitPrice,
                    reason: ''
                }));
                setItems(prItems);
            }
        }
        loadPR();
    }, [purchaseRequestId]);

    // This handles loading options for the PR Dropdown
    const loadPurchaseRequests = async (search: string) => {
        const res = await searchPurchaseRequests(search);
        // Res should be array of { id, prNumber, vendor: { name } }
        return res.map((pr: any) => ({
            label: `${pr.prNumber} - ${pr.vendor.name}`,
            value: pr.id
        }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!user || !vendorId) return;

        // Filter out items with 0 qty
        const validItems = items.filter(i => i.quantity > 0);

        if (validItems.length === 0) {
            alert("Please add at least one item with quantity > 0");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createReturn({
                userId: user.id,
                purchaseRequestId,
                vendorId,
                reason,
                notes,
                items: validItems.map(i => ({
                    itemId: i.itemId,
                    quantity: i.quantity,
                    unitPrice: Number(i.unitPrice), // Ensure number
                    reason: i.reason
                }))
            });

            if (result.success) {
                router.push('/returns');
            } else {
                alert('Failed to create return: ' + result.error);
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
                <Link href="/returns">
                    <Button variant="ghost" size="md">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Create Return Request
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Header Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg">Details</h3>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Purchase Request Ref</label>
                                <Dropdown
                                    loadOptions={loadPurchaseRequests}
                                    value={purchaseRequestId}
                                    onChange={(val) => setPurchaseRequestId(val)}
                                    placeholder="Search PR Number..."
                                    searchable
                                />
                            </div>

                            {vendorName && (
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Vendor</label>
                                    <p className="font-medium bg-gray-50 p-2 rounded border">{vendorName}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Return Reason</label>
                                <select
                                    className="w-full p-2 rounded-md border border-gray-300 bg-white"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value as ReturnReason)}
                                >
                                    <option value="DAMAGED">Damaged</option>
                                    <option value="LOW_QUALITY">Low Quality</option>
                                    <option value="OVERSTOCK">Overstock</option>
                                    <option value="WRONG_ITEM">Wrong Item</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea
                                    placeholder="Additional notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !purchaseRequestId} size="lg">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Submit Request
                    </Button>
                </div>

                {/* Items List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg">Items returning</h3>
                            {!purchaseRequestId && (
                                <p className="text-gray-500 text-sm italic">Select a Purchase Request to load items.</p>
                            )}

                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className={`flex gap-4 items-start p-4 rounded-lg border ${item.quantity > 0 ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                                        <div className="flex-1">
                                            <p className="font-medium">{item.itemName}</p>
                                            <p className="text-xs text-gray-500">Max Qty: {item.maxQty}</p>
                                        </div>

                                        <div className="w-24">
                                            <label className="text-xs block mb-1">Return Qty</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={item.maxQty}
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                                                className={item.quantity > 0 ? 'border-blue-500' : ''}
                                            />
                                        </div>

                                        <div className="w-10 pt-6">
                                            {/* Optional: Add remove button if they want to hide it completely */}
                                        </div>
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
