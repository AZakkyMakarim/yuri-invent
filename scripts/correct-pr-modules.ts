import { prisma } from '@/lib/prisma';

async function correctPermissionModules() {
    try {
        console.log('🔄 Correcting PR permission modules...');

        // Update pr_list permission to have module='pr_list'
        await prisma.permission.update({
            where: { name: 'pr_list' },
            data: { module: 'pr_list' }
        });
        console.log('✅ Updated pr_list module to "pr_list"');

        // Update pr_input permission to have module='pr_input'
        await prisma.permission.update({
            where: { name: 'pr_input' },
            data: { module: 'pr_input' }
        });
        console.log('✅ Updated pr_input module to "pr_input"');

        console.log('\n✅ Modules corrected! Now the UI toggles should work.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

correctPermissionModules();
