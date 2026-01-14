import { prisma } from '@/lib/prisma';

async function diagnose() {
    try {
        console.log('--- Permissions with "pr_" in name ---');
        const perms = await prisma.permission.findMany({
            where: {
                name: { contains: 'pr_' }
            }
        });

        perms.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.name} | Module: ${p.module}`);
        });

        console.log('\n--- Super Admin Role ---');
        const sa = await prisma.role.findFirst({
            where: { name: 'Super Admin' },
            include: { permissions: true }
        });

        if (sa) {
            console.log(`Role ID: ${sa.id}`);
            const saPerms = sa.permissions.filter(p => p.name.includes('pr_'));
            if (saPerms.length === 0) {
                console.log('Super Admin has NO "pr_" permissions assigned.');
            } else {
                saPerms.forEach(p => {
                    console.log(`[ASSIGNED] ${p.name} (Module: ${p.module})`);
                });
            }
        } else {
            console.log('Super Admin role NOT FOUND.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
