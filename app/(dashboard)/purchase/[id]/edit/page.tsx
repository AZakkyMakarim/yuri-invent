import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';
import ClientPRForm from '@/components/purchase/ClientPRForm';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPRPage({ params }: PageProps) {
    const { id } = await params;

    const pr = await prisma.purchaseRequest.findUnique({
        where: { id },
        include: {
            items: { include: { item: true } }
        }
    });

    if (!pr) notFound();

    // Only allow editing Draft or Rejected PRs
    if (pr.status !== 'DRAFT' && pr.status !== 'REJECTED') {
        redirect('/purchase');
    }

    // Fetch necessary data for the form
    const [vendors, activeRABs] = await Promise.all([
        prisma.vendor.findMany({
            where: { isActive: true },
            include: { suppliedItems: true },
            orderBy: { name: 'asc' }
        }),
        prisma.rAB.findMany({
            where: { status: 'APPROVED' }, // Only show approved RABs as source
            include: {
                rabLines: {
                    include: { item: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    // ClientPRForm logic for RAB items relies on 'rab.rabLines' which matches our fetch.

    return (
        <ClientPRForm
            vendors={serializeDecimal(vendors)}
            rabs={serializeDecimal(activeRABs)}
            initialData={serializeDecimal(pr)}
        />
    );
}
