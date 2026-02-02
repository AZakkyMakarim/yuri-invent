'use client';

import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

interface BlankSheetData {
    title: string;
    opnameId: string;
    location: string;
    scheduledDate: Date;
    items: Array<{
        no: number;
        itemName: string;
        sku: string;
        unit: string;
    }>;
}

interface BlankCountingSheetProps {
    data: BlankSheetData;
    onClose: () => void;
}

export function BlankCountingSheet({ data, onClose }: BlankCountingSheetProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 bg-white overflow-auto print:relative">
            {/* Print Header - Only shows on print */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            `}</style>

            {/* Action buttons - hide on print */}
            <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center shadow-sm z-10">
                <h2 className="text-lg font-bold">Blank Counting Sheet Preview</h2>
                <div className="flex gap-2">
                    <Button onClick={handlePrint} variant="primary">
                        Print / Save PDF
                    </Button>
                    <Button onClick={onClose} variant="ghost">
                        Close
                    </Button>
                </div>
            </div>

            {/* Sheet Content */}
            <div className="p-8 max-w-[210mm] mx-auto bg-white">
                {/* Header Section */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold border-b-2 border-black pb-2 mb-4 uppercase">
                        {data.title}
                    </h1>
                </div>

                {/* Info Section - Styled like the image */}
                <div className="mb-6 space-y-2">
                    <div className="flex gap-4">
                        <div className="w-32 font-semibold">TANGGAL</div>
                        <div>:</div>
                        <div className="flex-1 border-b border-gray-300 min-w-[300px]"></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-32 font-semibold">COUNTER / NAMA</div>
                        <div>:</div>
                        <div className="flex-1 border-b border-gray-300 min-w-[300px]"></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-32 font-semibold">JABATAN</div>
                        <div>:</div>
                        <div className="flex-1 border-b border-gray-300 min-w-[300px]"></div>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border-2 border-black">
                    <thead>
                        <tr className="bg-yellow-200">
                            <th className="border-2 border-black p-2 w-12 text-center font-bold">NO</th>
                            <th className="border-2 border-black p-2 text-left font-bold">NAMA BARANG</th>
                            <th className="border-2 border-black p-2 w-32 text-center font-bold">QTY FISIK</th>
                            <th className="border-2 border-black p-2 w-24 text-center font-bold">SATUAN</th>
                            <th className="border-2 border-black p-2 w-48 text-center font-bold">KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item) => (
                            <tr key={item.no}>
                                <td className="border-2 border-black p-2 text-center">{item.no}</td>
                                <td className="border-2 border-black p-2">{item.itemName}</td>
                                <td className="border-2 border-black p-2 bg-gray-50"></td>
                                <td className="border-2 border-black p-2 text-center">{item.unit}</td>
                                <td className="border-2 border-black p-2 bg-gray-50"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer info */}
                <div className="mt-4 text-xs text-gray-500 no-print">
                    <p>Opname ID: {data.opnameId}</p>
                    <p>Location: {data.location}</p>
                    <p>Scheduled: {format(new Date(data.scheduledDate), 'dd MMMM yyyy')}</p>
                </div>
            </div>
        </div>
    );
}
