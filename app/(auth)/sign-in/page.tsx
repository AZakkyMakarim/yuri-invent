'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { syncUserProfile } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LogIn, Lock, Mail } from 'lucide-react';

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);

            // Ensure profile exists (in case of DB reset while Auth persists)
            const syncResult = await syncUserProfile();
            if (!syncResult.success) {
                console.warn('Profile sync warning:', syncResult.error);
                // We don't block login, but it might fail later
            }

            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-(--color-bg-secondary) rounded-2xl shadow-2xl border border-(--color-border) p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-(--color-primary) to-blue-600 rounded-2xl shadow-lg mb-4">
                    <Lock size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                <p className="text-(--color-text-muted)">
                    Sign in to Yuri Invent Management System
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500 text-sm">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@yuriinvent.com"
                            required
                            className="pl-11"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <div className="relative">
                        <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="pl-11"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Signing in...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <LogIn size={20} />
                            Sign In
                        </span>
                    )}
                </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-(--color-border) text-center text-sm text-(--color-text-muted)">
                <p>© 2026 Yuri Invent. All rights reserved.</p>
            </div>
        </div>
    );
}
