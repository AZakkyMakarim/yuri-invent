
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const outbounds = await prisma.outbound.findMany();
    console.log(`Total Outbounds: ${outbounds.length}`);
    outbounds.forEach(o => {
        console.log(`ID: ${o.id}, Code: ${o.outboundCode}, Status: ${o.status}, CreatedAt: ${o.createdAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
