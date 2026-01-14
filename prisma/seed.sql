-- Initial Seed Data for Yuri Invent RBAC System
-- Run this SQL in Supabase SQL Editor after running migrations

-- =============================================================================
-- PERMISSIONS (36 total: 9 modules × 4 actions)
-- =============================================================================

INSERT INTO permissions (id, name, description, module, action, "createdAt", "updatedAt") VALUES
-- Vendors
('perm_vendors_create', 'vendors.create', 'Create vendors', 'vendors', 'create', NOW(), NOW()),
('perm_vendors_read', 'vendors.read', 'Read vendors', 'vendors', 'read', NOW(), NOW()),
('perm_vendors_update', 'vendors.update', 'Update vendors', 'vendors', 'update', NOW(), NOW()),
('perm_vendors_delete', 'vendors.delete', 'Delete vendors', 'vendors', 'delete', NOW(), NOW()),

-- Items
('perm_items_create', 'items.create', 'Create items', 'items', 'create', NOW(), NOW()),
('perm_items_read', 'items.read', 'Read items', 'items', 'read', NOW(), NOW()),
('perm_items_update', 'items.update', 'Update items', 'items', 'update', NOW(), NOW()),
('perm_items_delete', 'items.delete', 'Delete items', 'items', 'delete', NOW(), NOW()),

-- Categories
('perm_categories_create', 'categories.create', 'Create categories', 'categories', 'create', NOW(), NOW()),
('perm_categories_read', 'categories.read', 'Read categories', 'categories', 'read', NOW(), NOW()),
('perm_categories_update', 'categories.update', 'Update categories', 'categories', 'update', NOW(), NOW()),
('perm_categories_delete', 'categories.delete', 'Delete categories', 'categories', 'delete', NOW(), NOW()),

-- UOM
('perm_uom_create', 'uom.create', 'Create uom', 'uom', 'create', NOW(), NOW()),
('perm_uom_read', 'uom.read', 'Read uom', 'uom', 'read', NOW(), NOW()),
('perm_uom_update', 'uom.update', 'Update uom', 'uom', 'update', NOW(), NOW()),
('perm_uom_delete', 'uom.delete', 'Delete uom', 'uom', 'delete', NOW(), NOW()),

-- Users
('perm_users_create', 'users.create', 'Create users', 'users', 'create', NOW(), NOW()),
('perm_users_read', 'users.read', 'Read users', 'users', 'read', NOW(), NOW()),
('perm_users_update', 'users.update', 'Update users', 'users', 'update', NOW(), NOW()),
('perm_users_delete', 'users.delete', 'Delete users', 'users', 'delete', NOW(), NOW()),

-- Roles
('perm_roles_create', 'roles.create', 'Create roles', 'roles', 'create', NOW(), NOW()),
('perm_roles_read', 'roles.read', 'Read roles', 'roles', 'read', NOW(), NOW()),
('perm_roles_update', 'roles.update', 'Update roles', 'roles', 'update', NOW(), NOW()),
('perm_roles_delete', 'roles.delete', 'Delete roles', 'roles', 'delete', NOW(), NOW()),

-- Purchase
('perm_purchase_create', 'purchase.create', 'Create purchase', 'purchase', 'create', NOW(), NOW()),
('perm_purchase_read', 'purchase.read', 'Read purchase', 'purchase', 'read', NOW(), NOW()),
('perm_purchase_update', 'purchase.update', 'Update purchase', 'purchase', 'update', NOW(), NOW()),
('perm_purchase_delete', 'purchase.delete', 'Delete purchase', 'purchase', 'delete', NOW(), NOW()),

-- Inventory
('perm_inventory_create', 'inventory.create', 'Create inventory', 'inventory', 'create', NOW(), NOW()),
('perm_inventory_read', 'inventory.read', 'Read inventory', 'inventory', 'read', NOW(), NOW()),
('perm_inventory_update', 'inventory.update', 'Update inventory', 'inventory', 'update', NOW(), NOW()),
('perm_inventory_delete', 'inventory.delete', 'Delete inventory', 'inventory', 'delete', NOW(), NOW()),

-- Reports
('perm_reports_create', 'reports.create', 'Create reports', 'reports', 'create', NOW(), NOW()),
('perm_reports_read', 'reports.read', 'Read reports', 'reports', 'read', NOW(), NOW()),
('perm_reports_update', 'reports.update', 'Update reports', 'reports', 'update', NOW(), NOW()),
('perm_reports_delete', 'reports.delete', 'Delete reports', 'reports', 'delete', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- ROLES
-- =============================================================================

INSERT INTO roles (id, name, description, "isSystem", "createdAt", "updatedAt") VALUES
('role_super_admin', 'Super Admin', 'Full system access with all permissions', true, NOW(), NOW()),
('role_admin', 'Admin', 'Administrative access to manage inventory, vendors, and purchases', true, NOW(), NOW()),
('role_manager', 'Manager', 'Can view all data and manage inventory operations', true, NOW(), NOW()),
('role_user', 'User', 'Read-only access to view data', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- ROLE-PERMISSION MAPPINGS
-- =============================================================================

-- Super Admin: ALL permissions
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, 'role_super_admin'
FROM permissions p
ON CONFLICT DO NOTHING;

-- Admin: All except users and roles management
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, 'role_admin'
FROM permissions p
WHERE p.module NOT IN ('users', 'roles')
ON CONFLICT DO NOTHING;

-- Manager: Read all + update/delete inventory and purchase
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, 'role_manager'
FROM permissions p
WHERE p.action = 'read' 
   OR (p.module IN ('inventory', 'purchase', 'reports') AND p.action IN ('update', 'delete'))
ON CONFLICT DO NOTHING;

-- User: Read-only all modules
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, 'role_user'
FROM permissions p
WHERE p.action = 'read'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FIRST SUPER ADMIN USER
-- =============================================================================
-- NOTE: You need to create this user in Supabase Auth first, then update the supabaseId

INSERT INTO users (id, "supabaseId", email, name, "roleId", "isActive", "createdAt", "updatedAt") VALUES
('user_first_admin', 'REPLACE_WITH_SUPABASE_USER_ID', 'admin@yuriinvent.com', 'System Administrator', 'role_super_admin', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- DEFAULT MASTER DATA
-- =============================================================================

-- Default UOMs
INSERT INTO uoms (id, name, symbol, "isActive", "createdAt", "updatedAt") VALUES
('uom_pcs', 'Pieces', 'pcs', true, NOW(), NOW()),
('uom_kg', 'Kilogram', 'kg', true, NOW(), NOW()),
('uom_box', 'Box', 'box', true, NOW(), NOW()),
('uom_liter', 'Liter', 'L', true, NOW(), NOW()),
('uom_meter', 'Meter', 'm', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Default Categories
INSERT INTO categories (id, code, name, "isActive", "createdAt", "updatedAt") VALUES
('cat_elec', 'ELEC', 'Electronics', true, NOW(), NOW()),
('cat_furn', 'FURN', 'Furniture', true, NOW(), NOW()),
('cat_stat', 'STAT', 'Stationery', true, NOW(), NOW()),
('cat_tool', 'TOOL', 'Tools', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Uncomment to verify the data was inserted correctly:

-- SELECT COUNT(*) as permission_count FROM permissions;
-- SELECT COUNT(*) as role_count FROM roles;
-- SELECT r.name, COUNT(p.id) as permission_count 
-- FROM roles r 
-- LEFT JOIN "_PermissionToRole" pr ON pr."B" = r.id 
-- LEFT JOIN permissions p ON p.id = pr."A" 
-- GROUP BY r.name;
-- SELECT * FROM users;
