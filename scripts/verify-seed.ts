// Quick verification script
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

Promise.all([
    prisma.item.count(),
    prisma.vendor.count(),
    prisma.vendorItem.count()
]).then(([items, vendors, vendorItems]) => {
    console.log(`\n✅ Database Verification:`);
    console.log(`   Items: ${items}`);
    console.log(`   Vendors: ${vendors}`);
    console.log(`   Vendor-Item Associations: ${vendorItems}\n`);
}).finally(() => prisma.$disconnect());
