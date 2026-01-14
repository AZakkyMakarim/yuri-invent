'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, UserIcon, ShieldAlert } from 'lucide-react';
import {
    Button,
    Dropdown,
    Modal,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    TableEmpty,
    Badge,
    Toggle,
    TableFilters,
    FilterField,
    Pagination,
    TextFilter,
    MultiSelectFilter,
} from '@/components/ui';
import { apiFetch } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface Role {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string | null;
    email: string;
    role: Role | null;
    isActive: boolean;
    createdAt: string;
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface Filters {
    search: string;
    roleId: string[];
    status: string[];
}

interface UserForm {
    roleId: string;
    isActive: boolean;
}

const defaultFilters: Filters = {
    search: '',
    roleId: [],
    status: [],
};

const ITEMS_PER_PAGE = 10;

export default function UserList() {
    const t = useTranslations('master.user');
    const tCommon = useTranslations('common');

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);

    // UI State
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);

    // Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);

    // Form State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState<UserForm>({ roleId: '', isActive: false });

    // Fetch Roles
    const fetchRoles = useCallback(async () => {
        try {
            const data = await apiFetch<Role[]>('/roles');
            setRoles(data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    }, []);

    // Build Query
    const buildQueryString = useCallback(() => {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', ITEMS_PER_PAGE.toString());

        if (filters.search) params.set('search', filters.search);
        if (filters.roleId.length > 0) params.set('roleId', filters.roleId[0]);

        if (filters.status.length > 0) {
            if (filters.status.includes('Active') && !filters.status.includes('Inactive')) params.set('isActive', 'true');
            if (filters.status.includes('Inactive') && !filters.status.includes('Active')) params.set('isActive', 'false');
        }

        return params.toString();
    }, [page, filters]);

    // Fetch Users
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const query = buildQueryString();
            const response = await apiFetch<PaginatedResponse<User>>(`/users?${query}`);
            setUsers(response.data);
            setTotal(response.total);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    }, [buildQueryString]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handlers
    const applyFilters = () => {
        setFilters(pendingFilters);
        setPage(1);
    };

    const resetFilters = () => {
        setPendingFilters(defaultFilters);
        setFilters(defaultFilters);
        setPage(1);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setForm({
            roleId: user.role?.id || '',
            isActive: user.isActive,
        });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        setLoading(true);
        try {
            await apiFetch(`/users/${editingUser.id}`, {
                method: 'PUT',
                body: JSON.stringify(form),
            });
            setEditModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setLoading(false);
        }
    };

    const hasActiveFilters = filters.search !== '' || filters.roleId.length > 0 || filters.status.length > 0;

    return (
        <div className="animate-fadeIn space-y-4">
            {/* Header / Info Section */}
            <div className="bg-(--color-bg-secondary) border border-(--color-border) rounded-md p-4 flex items-start gap-4">
                <div className="p-2 bg-(--color-bg-tertiary) rounded-full">
                    <UserIcon size={24} className="text-(--color-primary)" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">User Management</h3>
                    <p className="text-(--color-text-secondary) text-sm">
                        New users sign up via the <span className="font-mono bg-(--color-bg-tertiary) px-1 rounded">/sign-up</span> page.
                        They appear here as <span className="text-yellow-600 font-medium">Inactive</span> until you verify them by assigning a role and setting them to Active.
                    </p>
                </div>
            </div>

            <TableFilters
                hasActiveFilters={hasActiveFilters}
                onApply={applyFilters}
                onReset={resetFilters}
            >
                <FilterField label="Search">
                    <TextFilter
                        value={pendingFilters.search}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, search: v })}
                        placeholder="Search name or email..."
                    />
                </FilterField>
                <FilterField label="Role">
                    <MultiSelectFilter
                        options={roles.map(r => r.name)}
                        selected={roles.filter(r => pendingFilters.roleId.includes(r.id)).map(r => r.name)}
                        onChange={(names) => {
                            const ids = roles.filter(r => names.includes(r.name)).map(r => r.id);
                            setPendingFilters({ ...pendingFilters, roleId: ids });
                        }}
                        placeholder="All Roles"
                    />
                </FilterField>
                <FilterField label="Status">
                    <MultiSelectFilter
                        options={['Active', 'Inactive']}
                        selected={pendingFilters.status}
                        onChange={(v) => setPendingFilters({ ...pendingFilters, status: v })}
                        placeholder="All"
                    />
                </FilterField>
            </TableFilters>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>{t('name')}</TableHead>
                        <TableHead>{t('email')}</TableHead>
                        <TableHead>{t('role')}</TableHead>
                        <TableHead>{tCommon('status')}</TableHead>
                        <TableHead>Joined At</TableHead>
                        <TableHead className="w-20">{tCommon('actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableEmpty colSpan={7} message={tCommon('noData')} />
                    ) : (
                        users.map((user, index) => (
                            <TableRow key={user.id} className={!user.isActive ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                                <TableCell className="text-(--color-text-muted)">
                                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                </TableCell>
                                <TableCell className="font-medium">{user.name || '-'}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.role ? (
                                        <Badge variant="info">{user.role.name}</Badge>
                                    ) : (
                                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                                            <ShieldAlert size={14} /> Pending
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.isActive ? 'success' : 'warning'}>
                                        {user.isActive ? 'Active' : 'Pending Verification'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-(--color-text-secondary)">
                                    {formatDate(user.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
                                        <Pencil size={16} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
            />

            {/* Edit / Verify Modal */}
            <Modal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={editingUser?.isActive ? `${tCommon('edit')} User` : "Verify User"}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button onClick={handleSaveEdit} isLoading={loading}>
                            {tCommon('save')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">User Email</label>
                        <p className="text-sm text-(--color-text-secondary) bg-(--color-bg-tertiary) p-2 rounded">{editingUser?.email}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <p className="text-sm text-(--color-text-secondary) bg-(--color-bg-tertiary) p-2 rounded">{editingUser?.name}</p>
                    </div>

                    <div className="border-t border-(--color-border) my-4"></div>

                    <Dropdown
                        label={t('role')}
                        value={form.roleId}
                        onChange={(v) => setForm({ ...form, roleId: v })}
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                        placeholder="Assign Role..."
                    />
                    <Toggle
                        label="Account Status"
                        description={form.isActive ? 'Active (User can login)' : 'Inactive (User cannot login)'}
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                </div>
            </Modal>
        </div>
    );
}
