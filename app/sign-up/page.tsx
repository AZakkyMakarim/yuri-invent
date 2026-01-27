'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                    },
                },
            });

            if (error) {
                alert(`Sign up failed: ${error.message}`);
            } else {
                setSuccess(true);
            }
        } catch (error) {
            console.error('Sign up error:', error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-(--color-bg-secondary) p-4">
                <div className="w-full max-w-md bg-(--color-bg-primary) p-8 rounded-lg shadow-lg border border-(--color-border) text-center">
                    <div className="flex justify-center mb-4">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Registration Successful</h1>
                    <p className="text-(--color-text-secondary) mb-6">
                        Your account has been created. Please contact the administrator to verify and activate your account.
                    </p>
                    <Link href="/sign-in">
                        <Button className="w-full">Return to Sign In</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-(--color-bg-secondary) p-4">
            <div className="w-full max-w-md bg-(--color-bg-primary) p-8 rounded-lg shadow-lg border border-(--color-border)">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold">Create an Account</h1>
                    <p className="text-(--color-text-secondary) mt-2">
                        Sign up to access Yuri Invent
                    </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="John Doe"
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="name@company.com"
                    />

                    <div className="relative">
                        <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="Min. 6 characters"
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-[34px] text-(--color-text-muted) hover:text-(--color-text-primary)"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <Button type="submit" className="w-full" isLoading={loading}>
                        Sign Up
                    </Button>

                    <div className="text-center text-sm text-(--color-text-secondary)">
                        Already have an account?{' '}
                        <Link href="/sign-in" className="text-(--color-primary) hover:underline">
                            Sign In
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

