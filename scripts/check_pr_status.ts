// import { prisma } from '@/lib/prisma';
import { PrismaClient } from '../generated_client/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log('Fetching all PRs with CUSTOM client...');
        const prs = await prisma.purchaseRequest.findMany({
            select: { id: true, prNumber: true, status: true }
        });
        console.log('All PRs:', JSON.stringify(prs, null, 2));
    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
main();
