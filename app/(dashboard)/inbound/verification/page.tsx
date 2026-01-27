'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Search,
    Loader2,
    Calendar,
    Truck,
    PackageCheck
} from 'lucide-react';
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
import { getInbounds, getInboundById } from '@/app/actions/inbound';
import dynamic from 'next/dynamic';

const InboundVerificationModal = dynamic(
    () => import('@/components/inbound/InboundVerificationModal'),
    {
        loading: () => <></>,
        ssr: false
    }
);

export default function InboundVerificationPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInbound, setSelectedInbound] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        // Always filter by PENDING_VERIFICATION
        const result = await getInbounds(1, 50, search, 'PENDING_VERIFICATION');
        if (result.success) {
            setData(result.data || []);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    const handleOpenVerification = async (inboundShallow: any) => {
        setIsLoadingDetails(true);
        const result = await getInboundById(inboundShallow.id);
        if (result.success) {
            setSelectedInbound(result.data);
            setIsModalOpen(true);
        } else {
            alert('Failed to load inbound details');
        }
        setIsLoadingDetails(false);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Inbound Verification
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Verify received goods and update stock
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-muted)" />
                        <Input
                            placeholder="Search GRN, PO, or Vendor..."
                            className="pl-9 bg-(--color-bg-secondary) border-(--color-border)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-(--color-border) overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>GRN Number</TableHead>
                                    <TableHead>Received Date</TableHead>
                                    <TableHead>PO Reference</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>Loading pending inbounds...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-(--color-text-muted)">
                                            No inbounds pending verification.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((inbound) => (
                                        <TableRow key={inbound.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium text-(--color-text-primary)">
                                                {inbound.grnNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-(--color-text-muted)" />
                                                    {format(new Date(inbound.receiveDate), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium">{inbound.purchaseRequest?.poNumber || '-'}</span>
                                                    <span className="text-xs text-(--color-text-muted)">{inbound.purchaseRequest?.prNumber}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Truck size={14} className="text-(--color-text-muted)" />
                                                    {inbound.vendor?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {inbound._count?.items || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenVerification(inbound)}
                                                    disabled={isLoadingDetails}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    {isLoadingDetails ? <Loader2 className="animate-spin h-4 w-4" /> : <PackageCheck size={16} className="mr-2" />}
                                                    Verify
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

            {/* Verification Modal */}
            {selectedInbound && (
                <InboundVerificationModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedInbound(null);
                    }}
                    onVerifySuccess={() => {
                        loadData();
                        alert('Inbound Verified Successfully! Stock has been updated.');
                    }}
                    inbound={selectedInbound}
                />
            )}
        </div>
    );
}
