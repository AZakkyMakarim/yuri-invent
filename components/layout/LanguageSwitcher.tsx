'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Select } from '@/components/ui/Select';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('common');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLocale = e.target.value;

        // Set cookie for next-intl (expires in 1 year)
        document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

        // Refresh page to apply new locale
        router.refresh();
    };

    return (
        <div className="flex items-center gap-2">
            <Globe size={16} className="text-(--color-text-secondary)" />
            <div className="w-32">
                <Select
                    options={[
                        { value: 'id', label: 'Bahasa' },
                        { value: 'en', label: 'English' }
                    ]}
                    value={locale}
                    onChange={handleChange}
                    className="h-8 text-sm py-1"
                />
            </div>
        </div>
    );
}
