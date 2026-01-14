import { prisma } from '@/lib/prisma';

async function verifyPermissions() {
    try {
        const permissions = await prisma.permission.findMany({
            where: {
                name: {
                    in: ['pr_list', 'pr_input']
                }
            }
        });
        console.log('Current Permissions in DB:');
        console.log(JSON.stringify(permissions, null, 2));

        const superAdmin = await prisma.role.findFirst({
            where: { name: 'Super Admin' },
            include: { permissions: true }
        });

        console.log('\nSuper Admin Permissions:');
        const superAdminHas = superAdmin?.permissions.filter(p => ['pr_list', 'pr_input'].includes(p.name));
        console.log(JSON.stringify(superAdminHas, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPermissions();
