'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPurchaseRequestById } from '@/app/actions/purchase';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

export default function PrintPOPage() {
    const params = useParams();
    const id = params.id as string;
    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadPO(id);
        }
    }, [id]);

    const loadPO = async (poId: string) => {
        setLoading(true);
        const result = await getPurchaseRequestById(poId);
        if (result.success) {
            setPo(result.data);
            // Auto print after a short delay to allow rendering
            setTimeout(() => {
                window.print();
            }, 1000);
        } else {
            alert('Failed to load PO: ' + result.error);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!po) {
        return <div className="p-8 text-center text-red-500">PO not found</div>;
    }

    return (
        <div className="bg-white min-h-screen text-black font-sans leading-normal">
            {/* No-Print Control Bar */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 flex justify-between items-center shadow-md z-50">
                <h1 className="font-bold text-lg">Print Preview</h1>
                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
                    <Printer size={16} /> Print Receipt
                </Button>
            </div>

            {/* Print Area (A4 Container) */}
            <div className="max-w-[210mm] mx-auto bg-white p-[15mm] shadow-lg print:shadow-none print:p-0 print:max-w-none mt-20 print:mt-0">

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                    <div>
                        {/* Company Logo/Name Placeholder */}
                        <div className="text-3xl font-bold tracking-tight mb-2">YURI INVENT</div>
                        <div className="text-sm text-gray-600">
                            Jl. Example Industrial Estate No. 123<br />
                            Jakarta, Indonesia 12345<br />
                            Phone: (021) 555-0123
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">PURCHASE ORDER</h1>
                        <div className="text-sm">
                            <div className="flex justify-end gap-4 mb-1">
                                <span className="text-gray-500 font-semibold w-24">PO Number:</span>
                                <span className="font-bold">{po.poNumber || 'DRAFT'}</span>
                            </div>
                            <div className="flex justify-end gap-4">
                                <span className="text-gray-500 font-semibold w-24">Date:</span>
                                <span className="font-bold">
                                    {format(new Date(po.poSentAt || po.updatedAt), 'dd MMM yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vendor & Ship To */}
                <div className="grid grid-cols-2 gap-12 mb-8">
                    <div>
                        <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider mb-2">VENDOR</h3>
                        <div className="font-bold text-lg mb-1">{po.vendor.name}</div>
                        <div className="text-sm text-gray-600 whitespace-pre-line">
                            {po.vendor.address || 'Address not listed'}
                            {po.vendor.phone && <><br />Phone: {po.vendor.phone}</>}
                            {po.vendor.email && <><br />Email: {po.vendor.email}</>}
                            {po.vendor.contactName && <><br />Attn: {po.vendor.contactName}</>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider mb-2">SHIP TO</h3>
                        <div className="font-bold text-lg mb-1">
                            {po.targetWarehouse?.name || 'Main Warehouse'}
                        </div>
                        <div className="text-sm text-gray-600 whitespace-pre-line">
                            {po.targetWarehouse?.location || 'Jl. Default Warehouse Address No. 1'}
                            <br />
                            {/* If we had receiver info, add here */}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8 border-y border-gray-200 py-4">
                    <div>
                        <div className="text-xs text-gray-500 font-bold uppercase">Payment Terms</div>
                        <div className="text-sm font-medium">{po.paymentType === 'SPK' ? 'Credit / SPK' : 'Cash / Non-SPK'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold uppercase">Estimated Delivery</div>
                        <div className="text-sm font-medium">
                            {po.estimatedShippingDate
                                ? format(new Date(po.estimatedShippingDate), 'dd MMM yyyy')
                                : 'TBD'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold uppercase">Reference PR</div>
                        <div className="text-sm font-medium">{po.prNumber}</div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-8">
                    <thead className="border-b-2 border-gray-800">
                        <tr>
                            <th className="py-2 text-left font-bold w-12">No</th>
                            <th className="py-2 text-left font-bold">Item Description</th>
                            <th className="py-2 text-right font-bold w-24">Qty</th>
                            <th className="py-2 text-right font-bold w-32">Unit Price</th>
                            <th className="py-2 text-right font-bold w-40">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {po.items.map((item: any, index: number) => (
                            <tr key={item.id}>
                                <td className="py-3 text-gray-500">{index + 1}</td>
                                <td className="py-3">
                                    <div className="font-bold">{item.item.name}</div>
                                    <div className="text-xs text-gray-500">{item.item.sku}</div>
                                    {item.notes && <div className="text-xs italic text-gray-400 mt-1">{item.notes}</div>}
                                </td>
                                <td className="py-3 text-right">{item.quantity} {item.item.uom?.symbol}</td>
                                <td className="py-3 text-right font-mono">{Number(item.unitPrice).toLocaleString('id-ID')}</td>
                                <td className="py-3 text-right font-bold font-mono">{Number(item.totalPrice).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-800">
                        <tr>
                            <td colSpan={3}></td>
                            <td className="py-4 text-right font-bold text-gray-600">Total Amount</td>
                            <td className="py-4 text-right font-bold text-xl font-mono">
                                {formatCurrency(Number(po.totalAmount), 'IDR')}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer Notes & Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-12">
                    <div>
                        <h3 className="font-bold text-sm mb-2">Notes & Instructions</h3>
                        <div className="text-xs text-gray-600 border border-gray-200 rounded p-3 min-h-[100px]">
                            {po.purchasingNotes || 'No special instructions.'}
                        </div>
                    </div>
                    <div>
                        <div className="grid grid-cols-2 gap-8 text-center mt-6">
                            <div>
                                <div className="h-20 border-b border-gray-300 mb-2"></div>
                                <div className="text-xs font-bold uppercase">Authorized By</div>
                            </div>
                            <div>
                                <div className="h-20 border-b border-gray-300 mb-2"></div>
                                <div className="text-xs font-bold uppercase">Vendor Acceptance</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-400 mt-16">
                    Generated by Yuri Invent System on {new Date().toLocaleString('id-ID')}
                </div>
            </div>
        </div>
    );
}
