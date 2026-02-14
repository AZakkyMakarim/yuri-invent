'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Pencil, Trash2, Check, X, TableProperties, Eye } from 'lucide-react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TableFilters,
    FilterField,
    MultiSelectFilter,
    TextFilter,
    Modal,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getPartners, createPartner, updatePartner } from '@/app/actions/partners';
import { useRouter } from 'next/navigation';

interface Partner {
    id: string;
    code: string;
    name: string;
    contactName: string | null;
    bankName: string | null;
    bankBranch?: string | null;
    bankAccount: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    isActive: boolean;
}

export default function PartnersPage() {
    const t = useTranslations('common'); // Use common translations for now
    const router = useRouter();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        status: [] as string[]
    });
    const [pendingFilters, setPendingFilters] = useState(filters);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address: '',
        phone: '',
        email: '',
        contactName: '',
        bankName: '',
        bankBranch: '',
        bankAccount: '',
        isActive: true
    });

    const fetchPartners = async () => {
        setLoading(true);
        const res = await getPartners();
        if (res.success) {
            setPartners(res.data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            address: '',
            phone: '',
            email: '',
            contactName: '',
            bankName: '',
            bankBranch: '',
            bankAccount: '',
            isActive: true
        });
        setIsEditing(false);
        setCurrentId(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (partner: any) => {
        setFormData({
            code: partner.code,
            name: partner.name,
            address: partner.address || '',
            phone: partner.phone || '',
            email: partner.email || '',
            contactName: partner.contactName || '',
            bankName: partner.bankName || '',
            bankBranch: partner.bankBranch || '',
            bankAccount: partner.bankAccount || '',
            isActive: partner.isActive
        });
        setIsEditing(true);
        setCurrentId(partner.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && currentId) {
                await updatePartner(currentId, formData);
            } else {
                await createPartner(formData);
            }
            setIsModalOpen(false);
            fetchPartners();
        } catch (error) {
            console.error('Failed to save partner:', error);
            alert('Failed to save partner');
        }
    };

    const filteredPartners = partners.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            p.code.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStatus = filters.status.length === 0 ||
            (filters.status.includes('Active') && p.isActive) ||
            (filters.status.includes('Inactive') && !p.isActive);

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Partners (Mitra)</h1>
                    <p className="text-(--color-text-muted)">Manage business partners and pricing.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => router.push('/master/partners/pricing')}>
                        <TableProperties className="mr-2 h-4 w-4" /> Pricing Matrix
                    </Button>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Partner
                    </Button>
                </div>
            </div>

            <TableFilters
                hasActiveFilters={!!filters.search || filters.status.length > 0}
                onApply={() => setFilters(pendingFilters)}
                onReset={() => {
                    setFilters({ search: '', status: [] });
                    setPendingFilters({ search: '', status: [] });
                }}
            >
                <FilterField label="Search">
                    <TextFilter
                        value={pendingFilters.search}
                        onChange={(v) => setPendingFilters(prev => ({ ...prev, search: v }))}
                        placeholder="Search partners..."
                    />
                </FilterField>
                <FilterField label="Status">
                    <MultiSelectFilter
                        options={['Active', 'Inactive']}
                        selected={pendingFilters.status}
                        onChange={(vals) => setPendingFilters(prev => ({ ...prev, status: vals }))}
                        placeholder="All Status"
                    />
                </FilterField>
            </TableFilters>

            <div className="border border-(--color-border) rounded-md shadow-sm bg-(--color-bg-card) overflow-hidden">
                <Table>
                    <TableHeader className="bg-(--color-bg-secondary)">
                        <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Person</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableEmpty colSpan={6} message="Loading..." />
                        ) : filteredPartners.length === 0 ? (
                            <TableEmpty colSpan={6} message="No partners found." />
                        ) : (
                            filteredPartners.map((partner, index) => (
                                <TableRow key={partner.id} onClick={() => router.push(`/master/partners/${partner.id}`)} className="cursor-pointer hover:bg-(--color-bg-secondary)">
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{partner.code}</TableCell>
                                    <TableCell className="font-medium">{partner.name}</TableCell>
                                    <TableCell>{partner.contactName || '-'}</TableCell>
                                    <TableCell>{partner.phone || '-'}</TableCell>
                                    <TableCell>{partner.email || '-'}</TableCell>
                                    <TableCell>{partner.address || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={partner.isActive ? 'success' : 'neutral'}>
                                            {partner.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-start gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`/master/partners/${partner.id}`)} title="View Detail">
                                                <Eye size={16} className="text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(partner)}>
                                                <Pencil size={16} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Partner' : 'Add New Partner'}
                footer={
                    <>
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save</Button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {isEditing && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Code</label>
                                <Input required value={formData.code} disabled />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contact Name</label>
                            <Input value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex items-center gap-2 border p-2 rounded">
                                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                                <span className="text-sm">Active</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Address</label>
                        <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-(--color-border)">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bank Name</label>
                            <Input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} placeholder="e.g. BCA" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cabang Bank</label>
                            <Input value={formData.bankBranch} onChange={e => setFormData({ ...formData, bankBranch: e.target.value })} placeholder="e.g. KCU Sudirman" />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Nomor Rekening</label>
                            <Input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="e.g. 1234567890" />
                        </div>
                    </div>
                </form>
            </Modal >
        </div >
    );
}
