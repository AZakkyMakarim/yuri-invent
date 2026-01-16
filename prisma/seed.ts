import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting database seed...');

    // Define the 28 specific sub-menu modules requested by the user
    const subMenuModules = [
        'Inbound List',
        'Inbound Verification',
        'Outbound List & Request',
        'Outbound Verification',
        'Stock Card',
        'Items',
        'PR List & Input',
        'PR Verification',
        'PO Verification',
        'Opname List',
        'Opname Schedule',
        'Adjustment List & Input',
        'Adjustment Verification',
        'Return List & Input',
        'Return Verification',
        'Bill List & Input',
        'Bill Verification',
        'Payment Realization',
        'Payment Validation',
        'RAB List',
        'RAB Input',
        'RAB Verification',
        'RAB Realization',
        'Categories & UOM',
        'Items & Stock',
        'Vendors',
        'Partners (Mitra)',
        'Users & Roles'
    ];

    // Standard actions (we'll create checks for all, but UI might just use one "access" or "read")
    // For simplicity and future-proofing, let's keep CRUD.
    const actions = ['read', 'create', 'update', 'delete'];

    console.log('Creating permissions...');
    const permissions = [];

    for (const moduleName of subMenuModules) {
        // Create a key-safe version of the module name (e.g. "Inbound List" -> "inbound_list")
        const moduleKey = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

        for (const action of actions) {
            const permission = await prisma.permission.upsert({
                where: { name: `${moduleKey}.${action}` },
                update: {
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleName}`,
                    // Update module mapping if needed to ensure consistency
                    module: moduleKey
                },
                create: {
                    name: `${moduleKey}.${action}`,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleName}`,
                    module: moduleKey,
                    action,
                },
            });
            permissions.push(permission);
        }
    }

    console.log(`✅ Created/Updated permissions for ${subMenuModules.length} modules.`);

    // Update Roles to have some default permissions based on the new modules
    // 1. Super Admin Role (all permissions)
    await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {
            permissions: {
                connect: permissions.map(p => ({ id: p.id })),
            },
        },
        create: {
            name: 'Super Admin',
            description: 'Full system access with all permissions',
            isSystem: true,
            permissions: {
                connect: permissions.map(p => ({ id: p.id })),
            },
        },
    });
    console.log('✅ Updated Super Admin role');

    // Create default UOMs and Categories if they don't exist
    // (Existing logic kept for safety)
    await prisma.uOM.createMany({
        data: [
            { name: 'Pieces', symbol: 'pcs' },
            { name: 'Kilogram', symbol: 'kg' },
        ],
        skipDuplicates: true,
    });
    await prisma.category.createMany({
        data: [
            { code: 'ELEC', name: 'Electronics' },
            { code: 'FURN', name: 'Furniture' },
        ],
        skipDuplicates: true,
    });

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
