'use client';

import { Button } from '@/components/ui/Button';
import { FileText, ArrowLeft } from 'lucide-react';

interface POActionsProps {
    prId: string;
    poDocumentPath?: string | null;
}

export default function POActions({ prId, poDocumentPath }: POActionsProps) {
    return (
        <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`/purchase/po/${prId}/print`, '_blank')}
            >
                <FileText size={14} className="mr-2" /> Print PO
            </Button>
            {(poDocumentPath) && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(poDocumentPath, '_blank')}
                >
                    <ArrowLeft size={14} className="mr-2 rotate-90" /> Download
                </Button>
            )}
        </div>
    );
}
