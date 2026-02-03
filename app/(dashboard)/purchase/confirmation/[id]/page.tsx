'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
    ArrowLeft,
    Check,
    FileText,
    Loader2,
    Upload,
    Clock,
    CheckCircle2,
    ImageIcon,
    Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import { getPurchaseRequestById, confirmPurchaseRequest } from '@/app/actions/purchase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/Badge';

interface EditableItem {
    itemId: string;
    itemCode: string;
    itemName: string;
    qty: number;
    originalPrice: number;
    realPrice: number;
    totalOriginal: number;
    totalReal: number;
    notes: string;
    imagePath?: string;
    sku?: string;
    barcode?: string;
    // Specifications
    category?: string;
    brand?: string;
    type?: string;
    color?: string;
    // Logistics
    movementType?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    uom: string;
}

export default function ConfirmationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    // Authorization Check
    useEffect(() => {
        if (!authLoading && user) {
            if (user.role?.name !== 'PURCHASING' && user.role?.name !== 'ADMIN' && user.role?.name !== 'Super Admin') {
                toast({
                    title: "Access Denied",
                    description: "You do not have permission to view this page.",
                    variant: "destructive"
                });
                router.push('/dashboard');
            }
        }
    }, [user, authLoading, router, toast]);

    // Data State
    const [pr, setPr] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<EditableItem[]>([]);

    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState<'SPK' | 'NON_SPK'>('SPK');
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (params.id) {
            loadPR(params.id as string);
        }
    }, [params.id]);

    const loadPR = async (id: string) => {
        setLoading(true);
        try {
            const result = await getPurchaseRequestById(id);
            if (result.success && result.data) {
                setPr(result.data);

                // Initialize Payment Type from Vendor
                const vType = result.data.vendor?.vendorType === 'SPK' ? 'SPK' : 'NON_SPK';
                setPaymentType(vType);

                // Initialize Items
                setItems(result.data.items.map((i: any) => ({
                    itemId: i.item.id,
                    itemCode: i.item.code,
                    itemName: i.item.name,
                    qty: i.quantity,
                    originalPrice: Number(i.unitPrice),
                    realPrice: Number(i.unitPrice),
                    totalOriginal: Number(i.totalPrice),
                    totalReal: Number(i.unitPrice) * i.quantity,
                    notes: '',
                    imagePath: i.item.imagePath,
                    sku: i.item.sku,
                    barcode: i.item.barcode,
                    // Specs
                    category: i.item.category?.name,
                    brand: i.item.brand,
                    type: i.item.type,
                    color: i.item.color,
                    // Logistics
                    movementType: i.item.movementType,
                    weight: i.item.weight,
                    length: i.item.length,
                    width: i.item.width,
                    height: i.item.height,
                    uom: i.item.uom?.symbol || '-'
                })));
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load PR details",
                    variant: "destructive"
                });
                router.push('/purchase/confirmation');
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Error loading PR",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Calculations
    const totalOriginalAmount = items.reduce((sum, i) => sum + i.totalOriginal, 0);
    const totalRealAmount = items.reduce((sum, i) => sum + (i.realPrice * i.qty), 0);
    const priceVariance = totalRealAmount - totalOriginalAmount;

    // Helper for input parsing
    const formatInputCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleItemChange = (index: number, field: keyof EditableItem, value: any) => {
        const newItems = [...items];

        if (field === 'realPrice') {
            // Remove non-digits
            const numericValue = Number(String(value).replace(/\D/g, ''));
            newItems[index] = { ...newItems[index], realPrice: numericValue, totalReal: numericValue * newItems[index].qty };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }

        setItems(newItems);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validation
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Invalid File",
                description: "Only PDF, JPG, and PNG are allowed",
                variant: "destructive"
            });
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast({
                title: "File too large",
                description: "File size exceeds 10MB limit",
                variant: "destructive"
            });
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            toast({
                title: "Missing Document",
                description: "Proof document (SPK/Invoice) is mandatory",
                variant: "destructive"
            });
            return;
        }

        if (!user?.id) return;

        if (!confirm("Are you sure you want to confirm this Purchase Request with the updated prices?")) return;

        setIsSubmitting(true);
        try {
            // Upload proof document
            let proofDocumentPath = '';
            const { data: { session } } = await supabase.auth.getSession();
            const headers: HeadersInit = {};

            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('poNumber', pr.prNumber);

            const response = await fetch('/api/upload/po-document', {
                method: 'POST',
                headers,
                body: formData
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to upload file');
            proofDocumentPath = result.path;

            // Confirm PR
            const res = await confirmPurchaseRequest(
                pr.id,
                user.id,
                paymentType,
                pr.vendorId,
                notes,
                proofDocumentPath,
                items.map(i => ({ itemId: i.itemId, realPrice: i.realPrice, notes: i.notes }))
            );

            if (res.success) {
                toast({
                    title: "Success",
                    description: "PR Confirmed Successfully",
                });
                router.push('/purchase/confirmation');
                router.refresh();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed: " + error.message,
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
            setIsConfirmationModalOpen(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: "bg-gray-100 text-gray-800",
            PENDING_MANAGER_APPROVAL: "bg-yellow-100 text-yellow-800",
            PENDING_PURCHASING_APPROVAL: "bg-orange-100 text-orange-800",
            APPROVED: "bg-green-100 text-green-800",
            REJECTED: "bg-red-100 text-red-800",
            CANCELLED: "bg-gray-200 text-gray-600",
        };
        return (
            <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
                {status.replace(/_/g, ' ')}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!pr) return null;

    return (
        <div className="space-y-6 w-full mx-auto p-6 animate-in fade-in duration-500 pb-20">
            {/* Header Navigation */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-(--color-text-primary)">
                        {pr.prNumber}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                        <Clock className="w-4 h-4" />
                        <span>Requested on {format(new Date(pr.requestDate), 'dd MMMM yyyy')}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {getStatusBadge(pr.status)}
                    <Button
                        size="sm"
                        onClick={() => setIsConfirmationModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                        <Check className="mr-2 h-4 w-4" />
                        Process Verification
                    </Button>
                </div>
            </div>

            {/* TOP SECTION: Transaction & Approval Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Transaction Details (Left - Wider) */}
                <div className="lg:col-span-8">
                    <Card className="border-(--color-border) shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-(--color-primary)" />
                                Transaction Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                                {/* Vendor Section */}
                                <div className="flex flex-col gap-3">
                                    <div className="text-xs font-bold uppercase text-(--color-text-muted) tracking-wider flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        Vendor Information
                                    </div>
                                    <div className="bg-(--color-bg-secondary)/30 p-3 rounded-md border border-(--color-border)/50 flex-1">
                                        <div className="font-semibold text-(--color-text-primary) text-lg mb-1">{pr.vendor?.name}</div>
                                        <div className="text-sm text-(--color-text-secondary) space-y-0.5">
                                            <p className="flex items-start gap-2">
                                                <span className="opacity-70 min-w-[60px]">Address:</span>
                                                <span>{pr.vendor?.address || '-'}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="opacity-70 min-w-[60px]">Phone:</span>
                                                <span>{pr.vendor?.phone || '-'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Destination Section */}
                                <div className="flex flex-col gap-3">
                                    <div className="text-xs font-bold uppercase text-(--color-text-muted) tracking-wider flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                        Destination
                                    </div>
                                    <div className="bg-(--color-bg-secondary)/30 p-3 rounded-md border border-(--color-border)/50 flex-1">
                                        <div className="font-semibold text-(--color-text-primary) text-lg mb-1">{pr.targetWarehouse?.name || 'Main Warehouse'}</div>
                                        <div className="text-sm text-(--color-text-secondary)">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-(--color-bg-secondary) border border-(--color-border) mb-2">
                                                {pr.targetWarehouse?.type === 'MAIN' ? 'Main Warehouse' : 'Branch Warehouse'}
                                            </span>
                                            <p className="opacity-80">{pr.targetWarehouse?.address || 'No address details'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Approval Status (Right - Narrower) */}
                <div className="lg:col-span-4">
                    <Card className="border-(--color-border) shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                            <CardTitle className="text-base font-semibold">Approval Status</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6 flex-1">
                            {/* Request Created */}
                            <div className="flex gap-4 relative">
                                <div className="absolute left-[7px] top-8 bottom-[-24px] w-0.5 bg-green-200 dark:bg-green-900"></div>
                                <div className="relative z-10 shrink-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white dark:ring-gray-950 mt-1.5 flex items-center justify-center">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-(--color-text-primary)">Request Created</div>
                                    <div className="text-xs text-(--color-text-muted) mt-0.5">
                                        {format(new Date(pr.createdAt), 'dd MMM yyyy, HH:mm')}
                                    </div>
                                    <div className="text-xs text-(--color-text-secondary) mt-1 bg-(--color-bg-secondary) px-2 py-0.5 rounded inline-block">
                                        by {pr.createdBy?.name || 'System'}
                                    </div>
                                </div>
                            </div>

                            {/* Manager Approval */}
                            <div className="flex gap-4 relative">
                                <div className={`absolute left-[7px] top-8 bottom-[-24px] w-0.5 ${pr.managerApprovedBy ? 'bg-green-200 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                                <div className={`relative z-10 shrink-0 w-4 h-4 rounded-full ring-4 ring-white dark:ring-gray-950 mt-1.5 flex items-center justify-center ${pr.managerApprovedBy ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                    {pr.managerApprovedBy ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/50" />}
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-(--color-text-primary)">Manager Approval</div>
                                    {pr.managerApprovedBy ? (
                                        <>
                                            <div className="text-xs text-(--color-text-muted) mt-0.5">
                                                {pr.managerApprovedAt && format(new Date(pr.managerApprovedAt), 'dd MMM yyyy, HH:mm')}
                                            </div>
                                            <div className="text-xs text-(--color-text-secondary) mt-1 bg-(--color-bg-secondary) px-2 py-0.5 rounded inline-block">
                                                by {pr.managerApprovedBy?.name}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-(--color-text-muted) italic mt-1">Pending...</div>
                                    )}
                                </div>
                            </div>

                            {/* Purchasing Verification (Current Step) */}
                            <div className="flex gap-4 relative">
                                <div className="relative z-10 shrink-0 w-4 h-4 rounded-full ring-4 ring-white dark:ring-gray-950 mt-1.5 flex items-center justify-center bg-blue-500 animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm text-blue-500">Purchasing Verification</div>
                                    <div className="text-xs text-(--color-text-muted) italic mt-1">In Progress (You)</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* BOTTOM SECTION: Items Table (Full Width) */}
            <Card className="border-(--color-border) shadow-xs overflow-hidden">
                <CardHeader className="pb-3 border-b border-(--color-border) bg-(--color-bg-secondary)/20">
                    <CardTitle>Request Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1500px] border-collapse">
                            <TableHeader className="bg-(--color-bg-secondary)">
                                <TableRow>
                                    <TableHead rowSpan={2} className="w-12 text-center border-r border-(--color-border) text-xs">No</TableHead>
                                    <TableHead colSpan={6} className="text-center border-r border-l border-(--color-border) h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80 text-xs text-white">Item Details</TableHead>
                                    <TableHead colSpan={4} className="text-center border-r border-(--color-border) h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80 text-xs text-white">Specifications</TableHead>
                                    <TableHead colSpan={3} className="text-center border-r border-(--color-border) h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80 text-xs text-white">Logistics</TableHead>
                                    <TableHead colSpan={4} className="text-center h-8 py-1 font-semibold text-(--color-text-primary) bg-(--color-bg-secondary)/80 text-xs text-white">Transaction</TableHead>
                                </TableRow>
                                <TableRow>
                                    {/* Item Details */}
                                    <TableHead className="w-[60px] text-center border-r border-l border-(--color-border) text-xs">Image</TableHead>
                                    <TableHead className="min-w-[200px] border-r border-(--color-border) text-xs">Item Name</TableHead>
                                    <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">SKU</TableHead>
                                    <TableHead className="min-w-[120px] border-r border-(--color-border) text-xs">Barcode</TableHead>
                                    <TableHead className="min-w-[50px] text-center border-r border-(--color-border) text-xs">UOM</TableHead>
                                    <TableHead className="min-w-[180px] border-r border-(--color-border) text-xs text-primary font-bold">Notes *</TableHead>

                                    {/* Specifications */}
                                    <TableHead className="min-w-[120px] border-r border-(--color-border) text-xs">Category</TableHead>
                                    <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">Brand</TableHead>
                                    <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">Type</TableHead>
                                    <TableHead className="min-w-[80px] border-r border-(--color-border) text-xs">Color</TableHead>

                                    {/* Logistics */}
                                    <TableHead className="min-w-[80px] border-r border-(--color-border) text-xs">Movement</TableHead>
                                    <TableHead className="min-w-[80px] border-r border-(--color-border) text-xs">Weight</TableHead>
                                    <TableHead className="min-w-[100px] border-r border-(--color-border) text-xs">Dimension</TableHead>

                                    {/* Transaction */}
                                    <TableHead className="min-w-[80px] text-right border-r border-(--color-border) text-xs">Qty</TableHead>
                                    <TableHead className="min-w-[120px] text-right border-r border-(--color-border) text-xs">Est. Price</TableHead>
                                    <TableHead className="min-w-[140px] text-right border-r border-(--color-border) text-xs text-primary font-bold">Real Price *</TableHead>
                                    <TableHead className="min-w-[120px] text-right text-xs">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.itemId} className="hover:bg-(--color-bg-secondary)/10">
                                        <TableCell className="text-center align-top font-medium text-(--color-text-muted) border-r border-(--color-border)">
                                            {index + 1}
                                        </TableCell>

                                        {/* Item Details */}
                                        <TableCell className="align-top border-r border-(--color-border) p-2">
                                            <div className="h-10 w-10 border rounded bg-white flex items-center justify-center overflow-hidden mx-auto">
                                                {item.imagePath ? (
                                                    <img src={item.imagePath} alt={item.itemName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="h-4 w-4 text-gray-300" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border)">
                                            <div className="font-medium text-white">{item.itemName}</div>
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary) font-mono">
                                            {item.sku || '-'}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.barcode || '-'}
                                        </TableCell>
                                        <TableCell className="align-top text-center border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.uom}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border)">
                                            <Input
                                                className="h-8 text-xs bg-transparent border-(--color-border)"
                                                placeholder="Add note..."
                                                value={item.notes}
                                                onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                            />
                                        </TableCell>

                                        {/* Specifications */}
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.category || '-'}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.brand || '-'}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.type || '-'}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.color || '-'}
                                        </TableCell>

                                        {/* Logistics */}
                                        <TableCell className="align-top border-r border-(--color-border)">
                                            {item.movementType ? (
                                                <Badge variant="neutral" className="text-[10px] h-5 px-1.5 font-normal">
                                                    {item.movementType}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {item.weight ? `${item.weight} g` : '-'}
                                        </TableCell>
                                        <TableCell className="align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {(item.length || item.width || item.height) ?
                                                `${item.length || 0}x${item.width || 0}x${item.height || 0}` : '-'}
                                        </TableCell>

                                        {/* Transaction */}
                                        <TableCell className="text-right align-top border-r border-(--color-border) font-medium text-white">
                                            {item.qty}
                                        </TableCell>
                                        <TableCell className="text-right align-top border-r border-(--color-border) text-sm text-(--color-text-secondary)">
                                            {formatCurrency(item.originalPrice)}
                                        </TableCell>
                                        <TableCell className="text-right align-top border-r border-(--color-border)">
                                            <Input
                                                type="text"
                                                value={formatInputCurrency(item.realPrice)}
                                                onChange={(e) => handleItemChange(index, 'realPrice', e.target.value)}
                                                className={`text-right h-8 text-sm ${item.realPrice !== item.originalPrice ? 'border-yellow-500 text-yellow-500' : 'bg-transparent border-(--color-border)'}`}
                                            />
                                            {item.realPrice !== item.originalPrice && (
                                                <div className="text-[10px] text-yellow-500 mt-1">Modified</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right align-top font-medium text-white">
                                            {formatCurrency(item.totalReal)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="p-4 bg-(--color-bg-secondary)/50 flex justify-end items-center border-t border-(--color-border)">
                        <div className="text-right">
                            <div className="flex items-center gap-4 justify-end">
                                <span className="font-bold text-lg text-(--color-text-secondary)">Total Amount:</span>
                                <span className="font-bold text-xl text-(--color-text-primary)">{formatCurrency(totalRealAmount)}</span>
                            </div>
                            {priceVariance !== 0 && (
                                <div className={`text-xs mt-1 ${priceVariance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {priceVariance > 0 ? '+' : ''}{formatCurrency(priceVariance)} (Variance from estimate)
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>



            {/* CONFIRMATION MODAL */}
            <Modal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                title="Verify & Generate PO"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsConfirmationModalOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedFile}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Confirm Verification
                        </Button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Payment Information */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-full shrink-0">
                                <Receipt className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-400 text-sm">Payment Method Information</h3>
                                <p className="text-sm text-slate-400 mt-1 mb-3">
                                    The payment method is automatically determined by the vendor type.
                                </p>

                                <div className="flex items-center gap-3">
                                    <div className="text-sm font-medium text-slate-300">Vendor Type:</div>
                                    <Badge variant={paymentType === 'SPK' ? 'info' : 'neutral'} className="text-sm px-3">
                                        {paymentType === 'SPK' ? 'SPK Vendor (Credit)' : 'Non-SPK Vendor (Cash)'}
                                    </Badge>
                                </div>

                                <div className="mt-2 text-xs text-slate-500 italic">
                                    {paymentType === 'SPK'
                                        ? 'Purchase Order will be issued immediately.'
                                        : 'Pre-payment is required for this transaction.'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Proof Document */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-(--color-text-primary) flex items-center justify-between">
                            Proof Document (SPK/Invoice) <span className="text-red-500">*</span>
                        </label>

                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${selectedFile ? 'border-green-500 bg-green-500/10' : 'border-(--color-border) hover:border-primary/50'}`}>
                            {selectedFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-green-500/20 rounded-full">
                                        <FileText className="text-green-500 h-8 w-8" />
                                    </div>
                                    <span className="text-sm font-medium truncate w-full px-2 text-(--color-text-primary) break-all">{selectedFile.name}</span>
                                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                        className="text-xs text-red-500 hover:text-red-400 underline mt-2"
                                    >
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block w-full h-full group">
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                                    <div className="flex flex-col items-center py-2">
                                        <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-slate-700 transition-colors">
                                            <Upload className="text-slate-400 group-hover:text-white transition-colors" size={24} />
                                        </div>
                                        <span className="text-sm text-primary font-medium hover:underline">Click to upload document</span>
                                        <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-(--color-text-primary)">
                            Internal Notes (Optional)
                        </label>
                        <Textarea
                            placeholder="Add any internal notes for this verification..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[100px] bg-transparent border-(--color-border)"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
