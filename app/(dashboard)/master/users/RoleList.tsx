'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Save, Check, Plus, Loader2, Lock, Trash2 } from 'lucide-react';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Input } from '@/components/ui';
import { apiFetch, cn } from '@/lib/utils';
import { updateRolePermissions, createRole } from '@/app/actions/roles';

interface Permission {
    id: string;
    name: string;
    module: string;
    action: string;
    description: string | null;
}

interface Role {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: Permission[];
}

// Ordered list based on user request (1-28)
// Keys must match the snake_case keys generated in seed.ts
const ORDERED_MODULES = [
    { key: 'inbound_list', label: 'Inbound List' },
    { key: 'inbound_verification', label: 'Inbound Verification' },
    { key: 'outbound_list_request', label: 'Outbound List & Request' }, // 'Outbound List & Request' -> outbound_list_request
    { key: 'outbound_verification', label: 'Outbound Verification' },
    { key: 'stock_card', label: 'Stock Card' },
    { key: 'items', label: 'Items' }, // 6
    { key: 'pr_list', label: 'PR List' },
    { key: 'pr_input', label: 'Create PR' },
    { key: 'pr_verification', label: 'PR Verification (Manager)' },
    { key: 'po_verification', label: 'PO Verification (Purchasing)' },
    { key: 'opname_list', label: 'Opname List' }, // 10
    { key: 'opname_schedule', label: 'Opname Schedule' },
    { key: 'adjustment_list_input', label: 'Adjustment List & Input' },
    { key: 'adjustment_verification', label: 'Adjustment Verification' },
    { key: 'return_list_input', label: 'Return List & Input' },
    { key: 'return_verification', label: 'Return Verification' }, // 15
    { key: 'bill_list_input', label: 'Bill List & Input' },
    { key: 'bill_verification', label: 'Bill Verification' },
    { key: 'payment_realization', label: 'Payment Realization' },
    { key: 'payment_validation', label: 'Payment Validation' },
    { key: 'rab_list', label: 'RAB List' }, // 20
    { key: 'rab_input', label: 'RAB Input' },
    { key: 'rab_verification', label: 'RAB Verification' },
    { key: 'rab_realization', label: 'RAB Realization' },
    { key: 'categories_uom', label: 'Categories & UOM' },
    { key: 'items_stock', label: 'Items & Stock' }, // 25
    { key: 'vendors', label: 'Vendors' },
    { key: 'partners_mitra_', label: 'Partners (Mitra)' }, // "Partners (Mitra)" -> partners_mitra_ (due to replace all non-alphanum)
    { key: 'users_roles', label: 'Users & Roles' },
];

import { useLoading } from '@/contexts/LoadingContext';

export default function RoleList() {
    const { startLoading, stopLoading } = useLoading();
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    // Manage Permissions State
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [hasChanges, setHasChanges] = useState(false);

    // Create Role State
    const [addRoleModalOpen, setAddRoleModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            apiFetch<Role[]>('/roles'),
            apiFetch<Permission[]>('/permissions')
        ]).then(([rolesData, permissionsData]) => {
            setRoles(rolesData);
            setAllPermissions(permissionsData);

            // Auto-select first role if none selected and roles exist
            if (rolesData.length > 0 && !selectedRoleId) {
                selectRole(rolesData[0]);
            }
        }).catch(error => {
            console.error('Error fetching data:', error);
        }).finally(() => {
            setLoading(false);
        });
    };

    const selectRole = (role: Role) => {
        setSelectedRoleId(role.id);
        setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
        setHasChanges(false);
    };

    const toggleGroup = (moduleKey: string) => {
        // Find all permissions belonging to this module
        const groupPermissions = allPermissions.filter(p => p.module === moduleKey);

        const groupPermissionIds = groupPermissions.map(p => p.id);

        // Check if all are currently selected
        const allSelected = groupPermissionIds.length > 0 && groupPermissionIds.every(id => selectedPermissions.has(id));
        const newSet = new Set(selectedPermissions);

        if (allSelected) {
            // Deselect all
            groupPermissionIds.forEach(id => newSet.delete(id));
        } else {
            // Select all
            groupPermissionIds.forEach(id => newSet.add(id));
        }
        setSelectedPermissions(newSet);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!selectedRoleId) return;
        startLoading();
        try {
            const result = await updateRolePermissions(selectedRoleId, Array.from(selectedPermissions));
            if (result.success) {
                // Update local roles state to reflect saved changes
                const updatedPermissions = allPermissions.filter(p => selectedPermissions.has(p.id));
                setRoles(prev => prev.map(r => {
                    if (r.id === selectedRoleId) {
                        return {
                            ...r,
                            permissions: updatedPermissions
                        };
                    }
                    return r;
                }));
                setHasChanges(false);
            } else {
                console.error('Failed to save:', result.error);
            }
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            stopLoading();
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) return;

        startLoading();
        try {
            const result = await createRole(newRoleName, newRoleDesc);
            if (result.success) {
                setAddRoleModalOpen(false);
                setNewRoleName('');
                setNewRoleDesc('');
                fetchData(); // Refresh list
            } else {
                console.error('Failed to create role:', result.error);
            }
        } catch (error) {
            console.error('Error creating role:', error);
        } finally {
            stopLoading();
        }
    };

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
            return;
        }

        startLoading();
        try {
            const response = await fetch(`/api/roles/${roleId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                fetchData(); // Refresh the data
            } else {
                alert('❌ Error: ' + result.error);
            }
        } catch (error: any) {
            alert('❌ Error: ' + error.message);
        } finally {
            stopLoading();
        }
    };

    const activeRole = roles.find(r => r.id === selectedRoleId);

    return (
        <div>
            <div className="flex items-center justify-between pb-4">
                <h3 className="font-semibold text-lg">Roles</h3>
                <Button size="sm" className="gap-2" onClick={() => setAddRoleModalOpen(true)}>
                    <Plus size={16} />
                    Add Role
                </Button>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-270px)]">
                {/* Left Sidebar: Roles List */}
                <div className="w-full lg:w-1/4 min-w-[250px] flex flex-col gap-4">
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden flex-1 flex flex-col">
                        <div className="p-2 space-y-1 overflow-y-auto flex-1">
                            {loading ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-[var(--color-text-muted)]" /></div>
                            ) : (
                                roles.map(role => (
                                    <div key={role.id} className="flex items-center gap-1">
                                        <button
                                            onClick={() => selectRole(role)}
                                            className={cn(
                                                "flex-1 text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between group",
                                                selectedRoleId === role.id
                                                    ? "bg-[var(--color-primary)] text-white"
                                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                                            )}
                                        >
                                            <span>{role.name}</span>
                                            {role.isSystem && (
                                                <Lock size={12} className={cn(
                                                    "opacity-50",
                                                    selectedRoleId === role.id ? "text-white" : "text-[var(--color-text-muted)]"
                                                )} />
                                            )}
                                        </button>
                                        {!role.isSystem && (
                                            <button
                                                onClick={() => handleDeleteRole(role.id, role.name)}
                                                className="p-2 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                title="Delete role"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Logic: Grouped Permission List */}
                <div className="flex-1 flex flex-col bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                    {activeRole ? (
                        <>
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-tertiary)]/30">
                                <div>
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <Shield className="text-[var(--color-primary)]" size={20} />
                                        Permission: {activeRole.name}
                                    </h2>
                                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                        {activeRole.description || 'Manage access levels for this role'}
                                    </p>
                                </div>
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasChanges}
                                    className="gap-2 min-w-[120px]"
                                >
                                    <Save size={16} />
                                    Save Changes
                                </Button>
                            </div>

                            {/* Grouped Permission List */}
                            <div className="flex-1 overflow-auto p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[70%]">Sub Menu / Module</TableHead>
                                            <TableHead className="w-[30%] text-center">Access</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ORDERED_MODULES.map((group) => {
                                            // Find all permissions for this group by module key
                                            const groupPermissions = allPermissions.filter(p => p.module === group.key);

                                            // Even if no permissions found (e.g. before seed runs fully), show the row?
                                            // The user expects these rows. But if permission doesn't exist, toggle does nothing.

                                            const groupPermissionIds = groupPermissions.map(p => p.id);
                                            const hasPermissions = groupPermissions.length > 0;
                                            const allSelected = hasPermissions && groupPermissionIds.every(id => selectedPermissions.has(id));

                                            return (
                                                <TableRow key={group.key} className="hover:bg-[var(--color-bg-hover)]/30 transition-colors">
                                                    <TableCell className="font-medium text-[var(--color-text-primary)] py-4">
                                                        {group.label}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center">
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={allSelected}
                                                                    disabled={!hasPermissions}
                                                                    onChange={() => hasPermissions && toggleGroup(group.key)}
                                                                />
                                                                <div className={cn(
                                                                    "w-11 h-6 peer-focus:outline-none rounded-full peer transition-colors",
                                                                    !hasPermissions ? "bg-[var(--color-bg-tertiary)] opacity-50 cursor-not-allowed" : "bg-(--color-bg-tertiary) peer-checked:bg-[var(--color-primary)]",
                                                                    "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"
                                                                )}></div>
                                                            </label>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                            <Shield size={48} className="mb-4 opacity-20" />
                            <p>Select a role to manage permissions</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Role Modal */}
            <Modal
                isOpen={addRoleModalOpen}
                onClose={() => setAddRoleModalOpen(false)}
                title="Add New Role"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAddRoleModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateRole} disabled={!newRoleName.trim()}>
                            Create Role
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Role Name</label>
                        <Input
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="e.g. Warehouse Supervisor"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Input
                            value={newRoleDesc}
                            onChange={(e) => setNewRoleDesc(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
