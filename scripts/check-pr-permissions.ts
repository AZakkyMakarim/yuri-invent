import { prisma } from '@/lib/prisma';

async function checkPermissions() {
    try {
        const permissions = await prisma.permission.findMany({
            where: {
                name: {
                    in: ['pr_list', 'pr_input']
                }
            }
        });

        console.log('Found permissions:', permissions);

        if (permissions.length < 2) {
            console.log('Missing permissions. Seeding now...');

            const newPermissions = [
                { name: 'pr_list', description: 'View Purchase Request List', module: 'purchase', action: 'read' },
                { name: 'pr_input', description: 'Create Purchase Request', module: 'purchase', action: 'create' }
            ];

            for (const p of newPermissions) {
                // Upsert to be safe
                await prisma.permission.upsert({
                    where: { name: p.name },
                    update: {},
                    create: p
                });
                console.log(`✅ Created/Verified permission: ${p.name}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPermissions();
