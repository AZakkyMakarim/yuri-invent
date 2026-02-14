
import { PrismaClient, OutboundStatus, OutboundType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration for legacy outbound data...');

    // 1. Update all outbounds created before the migration (assuming cutoff is now or based on isLegacy flag default false)
    // Actually, simple heuristic: if status is DRAFT and it is an old record (e.g. created > 1 hour ago), treat as Legacy Released.
    // Or just all records that don't have 'releasedQty' set (will be 0 by default migration).

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 1); // 1 hour ago to be safe, or just check 

    // Find candidates: Status is DRAFT (default), but created before cutoff.
    const candidates = await prisma.outbound.findMany({
        where: {
            status: OutboundStatus.DRAFT,
            createdAt: { lt: cutoffDate }
        },
        include: { items: true }
    });

    console.log(`Found ${candidates.length} legacy candidates to migrate.`);

    let successCount = 0;

    for (const ob of candidates) {
        try {
            await prisma.$transaction(async (tx) => {
                // Update Items: Set releasedQty = requestedQty
                for (const item of ob.items) {
                    await tx.outboundItem.update({
                        where: { id: item.id },
                        data: {
                            releasedQty: item.requestedQty
                        }
                    });
                }

                // Update Outbound Header
                await tx.outbound.update({
                    where: { id: ob.id },
                    data: {
                        status: OutboundStatus.RELEASED,
                        isLegacy: true,
                        approvedById: ob.createdById, // Auto-approve by creator
                        approvedAt: ob.createdAt,
                        releasedById: ob.createdById, // Auto-release by creator
                        releasedAt: ob.createdAt,
                        // Fix Type if null/default (legacy usually internal?)
                        type: OutboundType.INTERNAL_USE
                    }
                });
            });
            successCount++;
        } catch (error) {
            console.error(`Failed to migrate Outbound ${ob.id}:`, error);
        }
    }

    console.log(`Migration completed. Successfully migrated ${successCount}/${candidates.length} records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
