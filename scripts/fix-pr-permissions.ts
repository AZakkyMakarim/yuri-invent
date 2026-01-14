import { prisma } from '@/lib/prisma';

async function fixPermissions() {
    try {
        console.log('🔄 Checking PR permissions...');

        // 1. Ensure Permissions Exist
        const permissions = [
            { name: 'pr_list', description: 'View Purchase Request List', module: 'purchase', action: 'read' },
            { name: 'pr_input', description: 'Create Purchase Request', module: 'purchase', action: 'create' }
        ];

        for (const p of permissions) {
            await prisma.permission.upsert({
                where: { name: p.name },
                update: {},
                create: p
            });
            console.log(`   ✅ Permission verified: ${p.name}`);
        }

        // 2. Find Super Admin Role
        const superAdmin = await prisma.role.findFirst({
            where: { name: 'Super Admin' },
            include: { permissions: true }
        });

        if (!superAdmin) {
            console.error('   ❌ Super Admin role not found!');
            return;
        }
        console.log(`   ✅ Found Super Admin role: ${superAdmin.id}`);

        // 3. Assign Permissions
        const dbPermissions = await prisma.permission.findMany({
            where: {
                name: { in: permissions.map(p => p.name) }
            }
        });

        for (const perm of dbPermissions) {
            // Check if already assigned
            const isAssigned = superAdmin.permissions.some(p => p.id === perm.id);

            if (!isAssigned) {
                await prisma.role.update({
                    where: { id: superAdmin.id },
                    data: {
                        permissions: {
                            connect: { id: perm.id }
                        }
                    }
                });
                console.log(`   ✅ Assigned ${perm.name} to Super Admin`);
            } else {
                console.log(`   ℹ️  ${perm.name} already assigned to Super Admin`);
            }
        }

        console.log('\n✅ Permissions fixed! Please refresh the Roles page.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixPermissions();
