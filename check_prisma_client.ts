
import { PrismaClient, OutboundType } from '@prisma/client';

console.log('OutboundType:', OutboundType);

const prisma = new PrismaClient();
async function main() {
    console.log('Prisma Client initialized.');
    // Check if Outbound has 'type' field
    // We can't runtime check types easily, but if this compiles/runs, it means the runtime has it.

    // Try to create a dummy outbound check or just log the model names
    // Prisma internal:
    // @ts-ignore
    console.log('Model names:', Object.keys(prisma));
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
