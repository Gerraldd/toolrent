'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LoginPage() {
    const { t, language, setLanguage } = useLanguage();
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }

            // Fetch session to get user role
            const sessionRes = await fetch('/api/auth/session');
            const session = await sessionRes.json();

            // Redirect based on role
            if (session?.user?.role) {
                switch (session.user.role) {
                    case 'admin':
                        router.push('/admin/dashboard');
                        break;
                    case 'petugas':
                        router.push('/petugas/dashboard');
                        break;
                    case 'peminjam':
                        router.push('/peminjam/beranda');
                        break;
                    default:
                        router.push('/login');
                }
            } else {
                router.push('/admin/dashboard'); // Fallback
            }
        } catch {
            setError(t('login.error.generic'));
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white antialiased overflow-x-hidden min-h-screen flex flex-row">
            {/* Language Switcher - Absolute Top Right */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex h-9 w-9 items-center justify-center rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Terang</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Gelap</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>Sistem</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={() => setLanguage('id')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${language === 'id'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                >
                    ID
                </button>
                <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${language === 'en'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                >
                    EN
                </button>
            </div>

            {/* Left Side: Visual/Image */}
            <div className="hidden lg:flex relative w-1/2 flex-col justify-between bg-primary overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        alt="Background"
                        className="h-full w-full object-cover opacity-80 mix-blend-overlay"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsYawFTZ0_Hr3bJhqlOzJCeCPuAQtcFCaT42T26KSIG9_SqWSZg9JDUjNXSGKK2j1KdDT7qUPt-E4KyidAzOGqPY8P_evPRbACjd_FU44BemaLkmbpLJ1j1jMJZ7XLyqvD2dVE3AD-ecRfcyYYXav92RLNthzl27nOvQG_ZMtuMmjxrIWXqb2thzfUxKsG488HIYkWr3wACRlZJp82BqEVV3VOZ2umzRY9rLRk1wxWTzwUm_-eaZfU9Sh7siJIUmRWpmkZqKUyWSQM"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f3b61] via-[#1f3b61]/80 to-[#1f3b61]/40"></div>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-3xl">construction</span>
                        <span className="text-xl font-bold tracking-tight">ToolRent</span>
                    </div>
                    <div className="mb-12 max-w-lg">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
                            {t('login.hero.title')}
                        </h2>
                        <p className="text-blue-100 text-lg leading-relaxed opacity-90">
                            {t('login.hero.description')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex w-full lg:w-1/2 flex-col bg-white dark:bg-slate-900 relative">
                <div className="flex h-full w-full flex-col items-center justify-center p-6 sm:p-12 md:p-16">
                    <div className="w-full max-w-[440px] flex flex-col gap-8">
                        {/* Header Mobile Brand (Visible only on small screens) */}
                        <div className="lg:hidden flex items-center gap-2 mb-4 text-primary dark:text-white">
                            <span className="material-symbols-outlined text-3xl">construction</span>
                            <span className="text-xl font-bold tracking-tight">ToolRent</span>
                            {/* <span className="text-xl font-bold tracking-tight">{t('login.mobileBrand')}</span> */}
                        </div>

                        {/* Page Heading */}
                        <div className="flex flex-col gap-2">
                            <h1 className="text-primary dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.02em]">
                                {t('login.welcome')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-relaxed">
                                {t('login.subtitle')}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Login Form */}
                        <form className="flex flex-col gap-4 mt-2" onSubmit={handleLogin}>
                            {/* Email Field */}
                            <div className="flex flex-col gap-2">
                                <label className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                    {t('login.email')}
                                </label>
                                <div className="group flex w-full items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary h-10 overflow-hidden">
                                    <div className="flex items-center justify-center pl-3 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">person</span>
                                    </div>
                                    <input
                                        className="flex w-full flex-1 border-none bg-transparent px-3 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 text-sm h-full"
                                        id="email"
                                        placeholder={t('login.emailPlaceholder')}
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-none" htmlFor="password">
                                        {t('login.password')}
                                    </label>
                                </div>
                                <div className="group flex w-full items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary h-10 overflow-hidden">
                                    <div className="flex items-center justify-center pl-3 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                    <input
                                        className="flex w-full flex-1 border-none bg-transparent px-3 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 text-sm h-full"
                                        id="password"
                                        placeholder={t('login.passwordPlaceholder')}
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        className="flex items-center justify-center pr-3 text-slate-500 hover:text-primary transition-colors cursor-pointer outline-none"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <span className="material-symbols-outlined">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-md h-10 bg-primary hover:bg-primary-dark disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-semibold leading-normal tracking-wide transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>{t('login.signingIn')}</span>
                                    </div>
                                ) : (
                                    <span className="truncate">{t('login.signIn')}</span>
                                )}
                            </button>
                        </form>

                        {/* Copyright Footer */}
                        <div className="mt-8 text-center">
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                &copy; Copyright 2026 - Sistem Peminjaman Alat
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
