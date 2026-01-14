import { prisma } from '@/lib/prisma';
import { serializeDecimal } from '@/lib/utils';
import ClientPRForm from '@/components/purchase/ClientPRForm';

export const dynamic = 'force-dynamic';

export default async function PRInputPage() {
    // Fetch active vendors with their item relations for strict mapping
    const vendors = await prisma.vendor.findMany({
        where: { isActive: true },
        include: {
            suppliedItems: {
                where: { isActive: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    // Fetch Approved RABs for source selection
    const rabs = await prisma.rAB.findMany({
        where: { status: 'APPROVED' },
        include: {
            rabLines: {
                include: { item: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="p-6 space-y-6">
            <ClientPRForm vendors={serializeDecimal(vendors)} rabs={serializeDecimal(rabs)} />
        </div>
    );
}
