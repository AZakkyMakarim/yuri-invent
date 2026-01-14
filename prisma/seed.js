// Load environment variables
require('dotenv').config();

// Import from the generated location using absolute path
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'app', 'generated', 'prisma'));

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...\n');

    // Create Permissions
    console.log('📝 Creating permissions...');

    const modules = ['vendors', 'items', 'categories', 'uom', 'users', 'roles', 'purchase', 'inventory', 'reports'];
    const actions = ['create', 'read', 'update', 'delete'];

    const permissions = [];
    for (const module of modules) {
        for (const action of actions) {
            const permission = await prisma.permission.upsert({
                where: { name: `${module}.${action}` },
                update: {},
                create: {
                    name: `${module}.${action}`,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`,
                    module,
                    action,
                },
            });
            permissions.push(permission);
        }
    }

    console.log(`✅ Created ${permissions.length} permissions\n`);

    // Create Roles
    console.log('👥 Creating roles...');

    // 1. Super Admin Role (all permissions)
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: {
            name: 'Super Admin',
            description: 'Full system access with all permissions',
            isSystem: true,
            permissions: {
                connect: permissions.map(p => ({ id: p.id })),
            },
        },
    });
    console.log('✅ Created Super Admin role');

    // 2. Admin Role (most permissions except user/role management)
    const adminPermissions = permissions.filter(p =>
        !['users', 'roles'].includes(p.module)
    );
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrative access to manage inventory, vendors, and purchases',
            isSystem: true,
            permissions: {
                connect: adminPermissions.map(p => ({ id: p.id })),
            },
        },
    });
    console.log('✅ Created Admin role');

    // 3. Manager Role (can read all, update/delete inventory)
    const managerPermissions = permissions.filter(p =>
        (p.action === 'read') ||
        (['inventory', 'purchase', 'reports'].includes(p.module) && ['update', 'delete'].includes(p.action))
    );
    const managerRole = await prisma.role.upsert({
        where: { name: 'Manager' },
        update: {},
        create: {
            name: 'Manager',
            description: 'Can view all data and manage inventory operations',
            isSystem: true,
            permissions: {
                connect: managerPermissions.map(p => ({ id: p.id })),
            },
        },
    });
    console.log('✅ Created Manager role');

    // 4. User Role (read-only access)
    const userPermissions = permissions.filter(p => p.action === 'read');
    const userRole = await prisma.role.upsert({
        where: { name: 'User' },
        update: {},
        create: {
            name: 'User',
            description: 'Read-only access to view data',
            isSystem: true,
            permissions: {
                connect: userPermissions.map(p => ({ id: p.id })),
            },
        },
    });
    console.log('✅ Created User role\n');

    // Create First Super Admin User
    console.log('🔐 Creating first Super Admin user...');

    // Note: This is a placeholder supabaseId - you'll need to update it after first Supabase signup
    const firstAdmin = await prisma.user.upsert({
        where: { email: 'admin@yuriinvent.com' },
        update: {},
        create: {
            supabaseId: 'placeholder-will-be-updated', // Will be updated on first login
            email: 'admin@yuriinvent.com',
            name: 'System Administrator',
            roleId: superAdminRole.id,
            isActive: true,
        },
    });
    console.log(`✅ Created Super Admin user: ${firstAdmin.email}`);
    console.log(`   👉 Use this email to sign in via Supabase Auth\n`);

    // Create default master data
    console.log('📦 Creating default master data...');

    await prisma.uOM.createMany({
        data: [
            { name: 'Pieces', symbol: 'pcs' },
            { name: 'Kilogram', symbol: 'kg' },
            { name: 'Box', symbol: 'box' },
            { name: 'Liter', symbol: 'L' },
            { name: 'Meter', symbol: 'm' },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Created default UOMs');

    await prisma.category.createMany({
        data: [
            { code: 'ELEC', name: 'Electronics' },
            { code: 'FURN', name: 'Furniture' },
            { code: 'STAT', name: 'Stationery' },
            { code: 'TOOL', name: 'Tools' },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Created default categories\n');

    console.log('🎉 Seed completed successfully!\n');
    console.log('━'.repeat(50));
    console.log('📧 First Admin Email: admin@yuriinvent.com');
    console.log('🔑 You need to create this user in Supabase Auth Dashboard');
    console.log('━'.repeat(50));
}

main()
    .catch((e) => {
        console.error('\n❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
