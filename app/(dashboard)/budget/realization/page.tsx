'use client';

import { useState, useEffect } from 'react';
import { PieChart, List, Loader2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getRABList } from '@/app/actions/rab';

export default function RABRealizationPage() {
    const [rabs, setRabs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRABs();
    }, []);

    const loadRABs = async () => {
        setIsLoading(true);
        const result = await getRABList();
        if (result.success) {
            // Only show Approved RABs for monitoring
            setRabs(result.data?.filter((r: any) => r.status === 'APPROVED') || []);
        }
        setIsLoading(false);
    };

    return (
        <div className="animate-fadeIn p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="text-(--color-primary)" />
                        Budget Realization
                    </h1>
                    <p className="text-(--color-text-secondary)">Monitor budget usage vs allocation</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-12 text-center text-(--color-text-secondary)">
                        <Loader2 className="animate-spin inline-block mb-2" />
                        <p>Loading Realization Data...</p>
                    </div>
                ) : rabs.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-(--color-text-muted) bg-(--color-bg-card) rounded-xl border border-(--color-border)">
                        <List className="inline-block mb-2 opacity-50" size={32} />
                        <p>No Approved Budget Plans to monitor.</p>
                    </div>
                ) : (
                    rabs.map((rab) => {
                        const total = Number(rab.totalBudget);
                        const used = Number(rab.usedBudget);
                        const percentage = total > 0 ? (used / total) * 100 : 0;
                        const isOverBudget = percentage > 100;

                        return (
                            <div key={rab.id} className="bg-(--color-bg-card) rounded-xl border border-(--color-border) p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{rab.name}</h3>
                                        <p className="text-sm text-(--color-text-muted)">{rab.code}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-full">
                                        {rab.fiscalMonth}/{rab.fiscalYear}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-(--color-text-secondary)">Total Budget</span>
                                            <span className="font-mono font-medium">{formatCurrency(total, rab.currency)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-(--color-text-secondary)">Used Amount</span>
                                            <span className={`font-mono font-medium ${isOverBudget ? 'text-red-500' : 'text-(--color-primary)'}`}>
                                                {formatCurrency(used, rab.currency)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative pt-1">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className={`text-xs font-semibold inline-block ${isOverBudget ? 'text-red-600' : 'text-(--color-primary)'}`}>
                                                    {percentage.toFixed(1)}% Used
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-(--color-bg-tertiary)">
                                            <div
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${isOverBudget ? 'bg-red-500' : 'bg-(--color-primary)'}`}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

