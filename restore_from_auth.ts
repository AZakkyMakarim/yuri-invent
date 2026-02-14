
import { prisma } from './lib/prisma';

async function main() {
    console.log('🕵️ Checking auth.users...');
    try {
        const authUsers: any[] = await prisma.$queryRaw`SELECT id, email, raw_user_meta_data FROM auth.users`;
        console.log(`Found ${authUsers.length} users in auth.users system table.`);

        for (const u of authUsers) {
            console.log(`- ${u.email} (ID: ${u.id})`);

            // Check if exists in public.users
            const publicUser = await prisma.user.findUnique({ where: { supabaseId: u.id } });

            if (!publicUser) {
                console.log(`  ⚠️ MISSING in public.users! Attempting restore...`);

                // Find role
                const role = await prisma.role.findFirst({ where: { name: 'Super Admin' } });

                await prisma.user.create({
                    data: {
                        id: u.id,
                        supabaseId: u.id,
                        email: u.email,
                        name: u.raw_user_meta_data?.name || u.email.split('@')[0],
                        roleId: role?.id,
                        isActive: true
                    }
                });
                console.log(`  ✅ Restored to public.users`);
            } else {
                console.log(`  ✅ Exists in public.users`);
            }
        }
    } catch (e: any) {
        console.error('❌ Failed to access auth.users directly. The database user might not have permission.');
        console.error(e.message);
    }
}

main()
    .finally(async () => await prisma.$disconnect());
