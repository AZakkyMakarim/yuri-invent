'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Loader2, Eye, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getRABList, deleteRAB } from '@/app/actions/rab';

export default function RABListPage() {
    const router = useRouter();
    const [rabs, setRabs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadRABs();
    }, []);

    const loadRABs = async () => {
        setIsLoading(true);
        const result = await getRABList();
        if (result.success) {
            setRabs(result.data || []);
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Budget Plan?')) return;
        const result = await deleteRAB(id);
        if (result.success) {
            loadRABs();
        } else {
            alert(result.error);
        }
    };

    const filteredRabs = rabs.filter(rab =>
        rab.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rab.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fadeIn p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="text-(--color-primary)" />
                        Budget Plan (RAB)
                    </h1>
                    <p className="text-(--color-text-secondary)">Manage monthly budget plans</p>
                </div>
                <Link
                    href="/budget/input"
                    className="flex items-center gap-2 bg-(--color-primary) text-white px-4 py-2 rounded-lg hover:bg-(--color-primary)/90 transition-colors"
                >
                    <Plus size={18} />
                    Create New RAB
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={18} />
                    <input
                        type="text"
                        placeholder="Search by Code or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-card) focus:ring-2 focus:ring-(--color-primary) outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-(--color-bg-card) rounded-xl border border-(--color-border) overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-(--color-bg-tertiary) text-left">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">RAB Code</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">Period</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">Total Budget</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">Remaining</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">Status</th>
                                <th className="px-6 py-3 font-semibold text-sm text-(--color-text-secondary)">Created By</th>
                                <th className="px-6 py-3 text-right font-semibold text-sm text-(--color-text-secondary)">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--color-border)">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-(--color-text-secondary)">
                                        <Loader2 className="animate-spin inline-block mb-2" />
                                        <p>Loading Budget Plans...</p>
                                    </td>
                                </tr>
                            ) : filteredRabs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-(--color-text-muted)">
                                        No Budget Plans found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRabs.map((rab) => (
                                    <tr key={rab.id} className="hover:bg-(--color-bg-hover) transition-colors">
                                        <td className="px-6 py-4 font-medium">{rab.code}</td>
                                        <td className="px-6 py-4">{rab.fiscalMonth}/{rab.fiscalYear}</td>
                                        <td className="px-6 py-4 font-mono text-(--color-primary)">
                                            {formatCurrency(Number(rab.totalBudget), rab.currency)}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-(--color-success)">
                                            {formatCurrency(Number(rab.remainingBudget), rab.currency)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                                ${rab.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    rab.status === 'DRAFT' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {rab.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{rab.createdBy?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => router.push(`/budget/${rab.id}`)}
                                                className="p-1.5 hover:bg-(--color-bg-tertiary) rounded text-(--color-text-secondary)"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {rab.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleDelete(rab.id)}
                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
