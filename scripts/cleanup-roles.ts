
import { prisma } from '@/lib/prisma';

async function cleanupRoles() {
    try {
        console.log('🔍 Fetching all roles...');
        const roles = await prisma.role.findMany({
            select: { id: true, name: true, isSystem: true }
        });

        console.log('Found roles:', roles.map(r => r.name));

        // Find roles to keep
        const rolesToKeep = roles.filter(r =>
            r.name === 'Super Admin' || r.name === 'Head Invent'
        );

        // Find roles to delete
        const rolesToDelete = roles.filter(r =>
            r.name !== 'Super Admin' && r.name !== 'Head Invent'
        );

        console.log('\n📌 Roles to keep:', rolesToKeep.map(r => r.name));
        console.log('🗑️  Roles to delete:', rolesToDelete.map(r => r.name));

        // Delete roles (this will also delete their permission assignments due to cascade)
        if (rolesToDelete.length > 0) {
            console.log('\n🗑️  Deleting roles...');
            for (const role of rolesToDelete) {
                await prisma.role.delete({
                    where: { id: role.id }
                });
                console.log(`   ✅ Deleted: ${role.name}`);
            }
        }

        // Get all permissions
        console.log('\n🔍 Fetching all permissions...');
        const allPermissions = await prisma.permission.findMany({
            select: { id: true, module: true }
        });

        console.log(`   Found ${allPermissions.length} permissions`);

        // Find Super Admin role
        const superAdmin = rolesToKeep.find(r => r.name === 'Super Admin');

        if (superAdmin) {
            console.log('\n🔐 Assigning all permissions to Super Admin...');

            // Assign all permissions (This replaces existing ones, effectively clearing and setting)
            await prisma.role.update({
                where: { id: superAdmin.id },
                data: {
                    permissions: {
                        set: allPermissions.map(p => ({ id: p.id }))
                    }
                }
            });

            console.log(`   ✅ Assigned ${allPermissions.length} permissions to Super Admin`);
        } else {
            console.log('   ⚠️  Super Admin role not found!');
        }

        console.log('\n✅ Cleanup complete!');
        console.log('\n📊 Final roles:');
        const finalRoles = await prisma.role.findMany({
            include: {
                _count: {
                    select: { permissions: true }
                }
            }
        });

        finalRoles.forEach(role => {
            console.log(`   - ${role.name}: ${role._count.permissions} permissions`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupRoles();
