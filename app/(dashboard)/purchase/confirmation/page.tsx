'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getPurchaseRequestsPendingConfirmation } from '@/app/actions/purchase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PurchasingConfirmationPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [prs, setPrs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user) {
            loadData();
        }
    }, [authLoading, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getPurchaseRequestsPendingConfirmation();
            if (result.success) {
                setPrs(result.data);
            } else {
                toast({
                    title: "Error",
                    description: 'Failed to load data: ' + result.error,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: 'An error occurred',
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!user || (user.role?.name !== 'PURCHASING' && user.role?.name !== 'ADMIN' && user.role?.name !== 'Super Admin')) {
        return <div className="p-6">Access Denied. Purchasing role required.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Pending Confirmation</h1>
                    <p className="text-muted-foreground">Confirm vendor selection and finalize prices before issuing PO.</p>
                </div>
            </div>

            {prs.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No purchase requests pending confirmation at the moment.
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted border-b">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-muted-foreground">PR Number</th>
                                    <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                                    <th className="px-6 py-3 font-medium text-muted-foreground">Vendor</th>
                                    <th className="px-6 py-3 font-medium text-muted-foreground">Requestor</th>
                                    <th className="px-6 py-3 font-medium text-muted-foreground text-right">Amount (Est)</th>
                                    <th className="px-6 py-3 font-medium text-muted-foreground text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {prs.map((pr) => (
                                    <tr key={pr.id} className="bg-white dark:bg-gray-900 hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">
                                            {pr.prNumber}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {format(new Date(pr.requestDate), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{pr.vendor?.name}</div>
                                            {pr.vendor?.vendorType && (
                                                <Badge variant={pr.vendor.vendorType === 'SPK' ? 'info' : 'warning'} className="text-[10px] mt-1">
                                                    {pr.vendor.vendorType}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{pr.requestor?.name}</div>
                                            <div className="text-xs text-muted-foreground">{pr.requestDepartment?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            {formatCurrency(pr.totalAmount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button
                                                size="sm"
                                                onClick={() => router.push(`/purchase/confirmation/${pr.id}`)}
                                                className="gap-2"
                                            >
                                                Review & Confirm <ArrowRight size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
