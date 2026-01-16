'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Loader2,
    Calendar,
    CheckCircle2,
    ArrowRight,
    PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { getOutboundList } from '@/app/actions/outbound';

// Reusing list action but filtering in client or ideally creating a specific 'getPendingRelease' action
// For interface speed, we will use mock data or filtered list

export default function OutboundVerificationPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // In real impl, pass status='APPROVED' to filter server side
        const result = await getOutboundList(1, 20);
        if (result.success && result.data) {
            // Mock filtering for 'APPROVED' status which represents "Ready for Verification/Release"
            // Since we don't have seed data for approved outbounds, we might show empty or mock one.
            const approved = result.data.filter((i: any) => i.status === 'APPROVED');
            setData(approved);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Outbound Verification
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Release approved requests from warehouse
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardHeader className="pb-3 border-b border-(--color-border) mb-0">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <PackageCheck className="text-(--color-primary)" />
                        Ready for Release
                    </h2>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead>Outbound Code</TableHead>
                                    <TableHead>Approved Date</TableHead>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Items Count</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-(--color-primary)" />
                                                <span>Loading pending releases...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-(--color-text-muted)">
                                            No approved requests waiting for release.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-(--color-bg-hover)/50">
                                            <TableCell className="font-medium">
                                                {item.outboundCode}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={14} className="text-(--color-text-muted)" />
                                                    {item.approvedAt ? format(new Date(item.approvedAt), 'dd MMM yyyy') : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.mitra?.name || 'Internal'}
                                            </TableCell>
                                            <TableCell>
                                                {item._count?.items || 0} Items
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                                    Verify & Release <ArrowRight size={16} className="ml-1" />
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
        </div>
    );
}
