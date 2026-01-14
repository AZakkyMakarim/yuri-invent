import { AuthUser } from './auth';

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AuthUser | null, permissionName: string): boolean {
    if (!user || !user.role) {
        return false;
    }

    return user.role.permissions.some(p => p.name === permissionName);
}

/**
 * Check if user has permission for a module and action
 */
export function hasModulePermission(
    user: AuthUser | null,
    module: string,
    action: 'create' | 'read' | 'update' | 'delete'
): boolean {
    return hasPermission(user, `${module}.${action}`);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
    if (!user || !user.role) {
        return false;
    }

    return permissions.some(permissionName => hasPermission(user, permissionName));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AuthUser | null, permissions: string[]): boolean {
    if (!user || !user.role) {
        return false;
    }

    return permissions.every(permissionName => hasPermission(user, permissionName));
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, roleName: string): boolean {
    if (!user || !user.role) {
        return false;
    }

    return user.role.name === roleName;
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(user: AuthUser | null): boolean {
    return hasRole(user, 'Super Admin');
}

/**
 * Check if user is Admin or Super Admin
 */
export function isAdmin(user: AuthUser | null): boolean {
    return hasRole(user, 'Admin') || isSuperAdmin(user);
}

/**
 * Get all permission names for a user
 */
export function getUserPermissions(user: AuthUser | null): string[] {
    if (!user || !user.role) {
        return [];
    }

    return user.role.permissions.map(p => p.name);
}

/**
 * Permission constants for easy reference
 */
export const PERMISSIONS = {
    // Vendors
    VENDORS_CREATE: 'vendors.create',
    VENDORS_READ: 'vendors.read',
    VENDORS_UPDATE: 'vendors.update',
    VENDORS_DELETE: 'vendors.delete',

    // Items
    ITEMS_CREATE: 'items.create',
    ITEMS_READ: 'items.read',
    ITEMS_UPDATE: 'items.update',
    ITEMS_DELETE: 'items.delete',

    // Categories
    CATEGORIES_CREATE: 'categories.create',
    CATEGORIES_READ: 'categories.read',
    CATEGORIES_UPDATE: 'categories.update',
    CATEGORIES_DELETE: 'categories.delete',

    // UOM
    UOM_CREATE: 'uom.create',
    UOM_READ: 'uom.read',
    UOM_UPDATE: 'uom.update',
    UOM_DELETE: 'uom.delete',

    // Users
    USERS_CREATE: 'users.create',
    USERS_READ: 'users.read',
    USERS_UPDATE: 'users.update',
    USERS_DELETE: 'users.delete',

    // Roles
    ROLES_CREATE: 'roles.create',
    ROLES_READ: 'roles.read',
    ROLES_UPDATE: 'roles.update',
    ROLES_DELETE: 'roles.delete',

    // Purchase
    PURCHASE_CREATE: 'purchase.create',
    PURCHASE_READ: 'purchase.read',
    PURCHASE_UPDATE: 'purchase.update',
    PURCHASE_DELETE: 'purchase.delete',

    // Inventory
    INVENTORY_CREATE: 'inventory.create',
    INVENTORY_READ: 'inventory.read',
    INVENTORY_UPDATE: 'inventory.update',
    INVENTORY_DELETE: 'inventory.delete',

    // Reports
    REPORTS_CREATE: 'reports.create',
    REPORTS_READ: 'reports.read',
    REPORTS_UPDATE: 'reports.update',
    REPORTS_DELETE: 'reports.delete',
} as const;
