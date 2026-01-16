'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea'; // Assuming Textarea exists
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
// We will need a create action later
import { createOpname } from '@/app/actions/opname';

export default function ScheduleOpnamePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        opnameCode: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = await createOpname({
            opnameCode: formData.opnameCode || undefined,
            scheduledDate: new Date(formData.scheduledDate),
            notes: formData.notes
        });

        if (result.success) {
            router.push('/opname');
        } else {
            alert("Failed to schedule: " + result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/opname">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold bg-linear-to-r from-(--color-primary) to-(--color-secondary) bg-clip-text text-transparent">
                        Schedule Stock Opname
                    </h1>
                    <p className="text-(--color-text-secondary)">
                        Plan a new stock audit session
                    </p>
                </div>
            </div>

            <Card className="border-(--color-border) shadow-xs">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Opname Code (Optional / Auto-generated)</label>
                            <Input
                                placeholder="e.g. OP-2024-001"
                                value={formData.opnameCode}
                                onChange={e => setFormData({ ...formData, opnameCode: e.target.value })}
                            />
                            <p className="text-xs text-(--color-text-muted)">
                                If left blank, a code will be generated automatically.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Scheduled Date <span className="text-red-500">*</span></label>
                            <Input
                                type="date"
                                required
                                value={formData.scheduledDate}
                                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes / Instructions</label>
                            <Textarea
                                placeholder="Special instructions for the audit team..."
                                rows={4}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                                Schedule Opname
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
