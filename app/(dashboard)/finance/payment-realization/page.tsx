'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Loader2, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequests } from '@/app/actions/purchase';
import { submitPaymentRealization } from '@/app/actions/payment';
import PaymentRealizationModal, { PaymentRealizationData } from '@/components/finance/PaymentRealizationModal';

export default function PaymentRealizationPage() {
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPR, setSelectedPR] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        // Only fetch WAITING_PAYMENT status
        const result = await getPurchaseRequests(1, 50, search, 'WAITING_PAYMENT');
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleOpenModal = (pr: any) => {
        setSelectedPR(pr);
        setIsModalOpen(true);
    };

    const handleSubmitPayment = async (data: PaymentRealizationData) => {
        if (!selectedPR) return;

        try {
            const result = await submitPaymentRealization(
                selectedPR.id,
                data.amount,
                data.proofUrl,
                data.notes,
                data.paymentDate
            );

            if (result.success) {
                alert("Payment Realized Successfully!");
                setIsModalOpen(false);
                setSelectedPR(null);
                loadData();
            } else {
                alert("Failed: " + result.error);
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Payment Realization
                    </h1>
                    <p className="text-gray-500">
                        Process payments for Non-SPK vendors
                    </p>
                </div>
            </div>

            <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search PR..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>PR Number</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead className="text-right">Total Bill</TableHead>
                                    <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                                <span>Loading...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                            No pending payments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((pr) => (
                                        <TableRow key={pr.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-medium">
                                                {pr.prNumber}
                                                {pr.notes && <div className="text-xs text-gray-400 truncate max-w-[200px]">{pr.notes}</div>}
                                            </TableCell>
                                            <TableCell>{format(new Date(pr.requestDate), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{pr.vendor?.name}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                {formatCurrency(Number(pr.totalAmount))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenModal(pr)}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <DollarSign size={16} className="mr-1" />
                                                    Pay
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/purchase/${pr.id}`)}
                                                    className="ml-2 text-gray-500"
                                                    title="View Details"
                                                >
                                                    <ExternalLink size={16} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selectedPR && (
                <PaymentRealizationModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedPR(null);
                    }}
                    onSubmit={handleSubmitPayment}
                    purchaseRequest={selectedPR}
                />
            )}
        </div>
    );
}
