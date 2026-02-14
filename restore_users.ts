
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { prisma } from './lib/prisma';

// Use Service Role Key to bypass RLS and access Auth Admin API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env');
    console.error('   Please add SUPABASE_SERVICE_ROLE_KEY to your .env file to restore users.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function restoreUsers() {
    console.log('🔄 Fetching users from Supabase Auth...');

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Failed to fetch users from Supabase:', error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log('⚠️ No users found in Supabase Auth.');
        return;
    }

    console.log(`Found ${users.length} users. Restoring to local database...`);

    let restoredCount = 0;

    // Get Admin Role
    const adminRole = await prisma.role.findFirst({
        where: { name: 'Super Admin' } // Or 'Admin' depending on seed
    });

    for (const user of users) {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { supabaseId: user.id }
            });

            if (existingUser) {
                console.log(`- User ${user.email} already exists. Skipping.`);
                continue;
            }

            // Restore user
            await prisma.user.create({
                data: {
                    supabaseId: user.id,
                    email: user.email!,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
                    roleId: adminRole?.id, // Default to Admin for now to restore access
                    isActive: true,
                }
            });
            console.log(`✅ Restored user: ${user.email}`);
            restoredCount++;
        } catch (e: any) {
            console.error(`❌ Failed to restore user ${user.email}:`, e.message);
        }
    }

    console.log(`\n🎉 Restoration complete. Restored ${restoredCount} users.`);
}

restoreUsers()
    .catch((e) => {
        console.error('❌ Script failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
