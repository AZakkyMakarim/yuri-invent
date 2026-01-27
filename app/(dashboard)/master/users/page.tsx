'use client';

import { useTranslations } from 'next-intl';
import { UserCog, Users, Shield } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import UserList from './UserList';
import RoleList from './RoleList';

export default function UsersPage() {
    const t = useTranslations('master.user');

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <UserCog size={24} className="text-(--color-primary)" />
                    <h1 className="text-xl font-bold">{t('title')}</h1>
                </div>
            </div>

            <Tabs
                tabs={[
                    { id: 'users', label: t('tabs.users'), icon: <Users size={18} /> },
                    { id: 'roles', label: t('tabs.roles'), icon: <Shield size={18} /> },
                ]}
                defaultTab="users"
            >
                {(activeTab) => (
                    <div className="mt-4">
                        {activeTab === 'users' && <UserList />}
                        {activeTab === 'roles' && <RoleList />}
                    </div>
                )}
            </Tabs>
        </div>
    );
}
