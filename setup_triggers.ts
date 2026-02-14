
import { prisma } from './lib/prisma';

async function main() {
    console.log('🔧 Setting up Supabase Auth Triggers...');

    // 1. Enable pgcrypto for UUID generation (if needed)
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Create the Function
    /*
       This function will:
       - Check if this is the FIRST user. If so, assign 'Super Admin' role.
       - Otherwise, assign 'Staff' role (or NULL if you prefer approval).
       - Insert into public.users using the auth.users data.
    */
    await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    DECLARE
      default_role_id TEXT;
      is_first_user BOOLEAN;
    BEGIN
      -- Check if any user exists
      SELECT COUNT(*) = 0 INTO is_first_user FROM public.users;
      
      -- Get Role ID
      IF is_first_user THEN
        SELECT id INTO default_role_id FROM public.roles WHERE name = 'Super Admin' LIMIT 1;
      ELSE
        -- Default to 'Warehouse Staff' or 'Purchasing Staff'? 
        -- Or just leave NULL for now. 
        -- Let's use 'Warehouse Staff' as a safe default, or NULL.
        -- Let's try to find a default role, e.g., 'Viewer' or just NULL.
        -- If NULL, they can't do much until approved. This is safer.
        default_role_id := NULL;
      END IF;

      INSERT INTO public.users (
        "id", 
        "supabaseId", 
        "email", 
        "name", 
        "roleId", 
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        new.id::text, -- Use the same UUID for convenience
        new.id::text,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        default_role_id,
        true,
        now(),
        now()
      );
      
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

    console.log('✅ Function handle_new_user created.');

    // 3. Create the Trigger
    // Drop first to avoid duplicates/errors
    await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  `);

    console.log('✅ Trigger on_auth_user_created created.');
    console.log('🎉 Database is ready for new Sign Ups!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to setup triggers:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
