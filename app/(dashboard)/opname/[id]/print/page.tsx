'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getOpnameById } from '@/app/actions/opname';
import { Package, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function BeritaAcaraPage() {
    const params = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string);
        }
    }, [params.id]);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            const result = await getOpnameById(id);
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) return <div className="p-8 text-center">Loading...</div>;

    const opnameDate = new Date(data.scheduledDate); // checking if completedAt exists? using scheduledDate for now as per requirement visual

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
            <div className="max-w-[210mm] mx-auto bg-white p-[10mm] shadow-md print:shadow-none">
                {/* Print Button - Hidden when printing */}
                <div className="mb-6 flex justify-end print:hidden">
                    <Button onClick={() => window.print()} className="flex items-center gap-2">
                        <Printer size={18} />
                        Print Berita Acara
                    </Button>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="flex items-center gap-4">
                        {/* Logo Placeholder */}
                        <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Package className="text-orange-500 w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-red-900/80 uppercase tracking-wide">PT Yuri Perkasa Mahardika</h1>
                            <p className="text-sm text-gray-600 max-w-md">
                                Jl. Merpati No. 98 Mancasan Lor Dero, Condongcatur, Kec. Depok, Sleman
                                <br />DI Yogyakarta – 55283
                                <br />☎ : 0811-2800-2453
                            </p>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <h2 className="text-xl font-bold uppercase underline underline-offset-4 decoration-2">BERITA ACARA</h2>
                    <p className="font-semibold text-gray-700 mt-1">
                        No. {data.opnameCode.replace('OP-', '')}/BA-YURI/{format(opnameDate, 'MM/yyyy')}
                    </p>
                </div>

                {/* Subject */}
                <div className="mb-6">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="w-24 font-semibold align-top">Perihal</td>
                                <td className="w-4 text-center align-top">:</td>
                                <td className="font-semibold">
                                    Hasil Stock Opname Gudang Yuri Periode {format(opnameDate, 'MMMM yyyy', { locale: id })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Intro Text */}
                <div className="mb-6 text-justify leading-relaxed">
                    <p>
                        Pada hari {format(opnameDate, 'eeee', { locale: id })} tanggal {format(opnameDate, 'd MMMM yyyy', { locale: id })},
                        telah dilakukan Stock Opname barang dagang Gudang Yuri bersama tim audit.
                        Berdasarkan pengecekan yang telah dilakukan, masih terdapat barang yang selisih antara jumlah fisik di gudang
                        dengan kuantitas di sistem Yuri Invent, berikut untuk detail hasilnya :
                    </p>
                </div>

                {/* Table */}
                <div className="mb-8">
                    <table className="w-full border-collapse border border-gray-800 text-sm">
                        <thead>
                            <tr className="bg-gray-100 font-bold text-center">
                                <th className="border border-gray-400 px-2 py-1 w-10">NO</th>
                                <th className="border border-gray-400 px-2 py-1 text-left">NAMA PRODUK</th>
                                <th className="border border-gray-400 px-2 py-1 w-24">SATUAN</th>
                                <th className="border border-gray-400 px-2 py-1 w-24">SYSTEM</th>
                                <th className="border border-gray-400 px-2 py-1 w-24">HASIL SO</th>
                                <th className="border border-gray-400 px-2 py-1 w-20">SELISIH</th>
                                <th className="border border-gray-400 px-2 py-1 text-left">KETERANGAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.counts
                                .filter((c: any) => c.variance !== 0) // Only showing variances as per "Barang yang selisih" text? 
                                // Actually image serves showing "STOCK SUDAH SESUAI". So maybe ALL items? 
                                // The text says "masih terdapat barang yang selisih... berikut detail hasilnya". 
                                // Usually ONLY variances are critical, but the image shows items with "0" variance too.
                                .concat(data.counts.filter((c: any) => c.variance === 0)) // Let's show all, but variances first? or just all? 
                                // Image seems sorted by name or ID. Let's just map data.counts
                                .sort((a: any, b: any) => a.item.name.localeCompare(b.item.name))
                                .map((item: any, index: number) => {
                                    const hasvariance = item.variance !== 0;
                                    return (
                                        <tr key={item.id} className={hasvariance ? "bg-orange-50/50" : ""}>
                                            <td className="border border-gray-400 px-2 py-1 text-center">{index + 1}</td>
                                            <td className="border border-gray-400 px-2 py-1">{item.item.name}</td>
                                            <td className="border border-gray-400 px-2 py-1 text-center">{item.item.uom?.name || 'PCS'}</td>
                                            <td className="border border-gray-400 px-2 py-1 text-center">{item.systemQty}</td>
                                            <td className="border border-gray-400 px-2 py-1 text-center font-bold">{item.finalQty}</td>
                                            <td className={`border border-gray-400 px-2 py-1 text-center font-bold ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-blue-600' : ''}`}>
                                                {item.variance}
                                            </td>
                                            <td className="border border-gray-400 px-2 py-1 text-xs">
                                                {item.variance === 0 ? 'STOCK SUDAH SESUAI' :
                                                    item.variance > 0 ? `LEBIH ${item.variance} ${item.item.uom?.name || ''}` :
                                                        `KURANG ${Math.abs(item.variance)} ${item.item.uom?.name || ''}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Signatures */}
                <div className="mt-12 mb-4 break-inside-avoid">
                    <p className="mb-8">Demikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>

                    <div className="flex justify-between text-center px-12">
                        <div>
                            <p className="mb-20">Dibuat Oleh,</p>
                            <p className="font-bold underline uppercase">( Tim Audit )</p>
                        </div>
                        <div>
                            <p className="mb-20">Diketahui Oleh,</p>
                            <p className="font-bold underline uppercase">( Kepala Gudang )</p>
                        </div>
                        <div>
                            <p className="mb-20">Disetujui Oleh,</p>
                            <p className="font-bold underline uppercase">( Management )</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
