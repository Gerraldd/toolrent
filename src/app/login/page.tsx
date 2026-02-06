'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, AlertTriangle, Upload, CheckCircle2, Loader2, Database, ChevronDown, Check, Lock, Eye, EyeOff } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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

    // Database empty detection
    const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [masterPassword, setMasterPassword] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [restoreSuccess, setRestoreSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // DB List feature state
    const [dbListEnabled, setDbListEnabled] = useState(false);
    const [databases, setDatabases] = useState<{ name: string, hasValidSchema: boolean }[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState('');
    const [showDbDropdown, setShowDbDropdown] = useState(false);
    const [loadingDatabases, setLoadingDatabases] = useState(false);
    const [invalidSchemaDialogOpen, setInvalidSchemaDialogOpen] = useState(false);
    const [pendingDatabase, setPendingDatabase] = useState('');

    // Master password validation for database switch
    const [dbSwitchDialogOpen, setDbSwitchDialogOpen] = useState(false);
    const [dbSwitchPassword, setDbSwitchPassword] = useState('');
    const [dbSwitchError, setDbSwitchError] = useState('');
    const [verifyingPassword, setVerifyingPassword] = useState(false);
    const [showDbSwitchPassword, setShowDbSwitchPassword] = useState(false);
    const [switchingDatabase, setSwitchingDatabase] = useState(false);

    // Check database status on mount
    useEffect(() => {
        const checkDatabaseStatus = async () => {
            try {
                const response = await fetch('/api/database/status');
                const data = await response.json();
                if (data.success && data.isEmpty) {
                    setIsDatabaseEmpty(true);
                }
            } catch (error) {
                console.error('Failed to check database status:', error);
            }
        };
        checkDatabaseStatus();
    }, [restoreSuccess]);

    // Check if DB_LIST feature is enabled and fetch databases
    useEffect(() => {
        const checkDbListFeature = async () => {
            try {
                const response = await fetch('/api/settings/db-list');
                const data = await response.json();
                if (data.success && data.dbListEnabled) {
                    setDbListEnabled(true);
                    fetchDatabases();
                    // Get current selected database
                    const selectedRes = await fetch('/api/db-manager/selected');
                    const selectedData = await selectedRes.json();
                    if (selectedData.success && selectedData.selectedDatabase) {
                        setSelectedDatabase(selectedData.selectedDatabase);
                    }
                }
            } catch (error) {
                console.error('Failed to check DB_LIST setting:', error);
            }
        };
        checkDbListFeature();
    }, []);

    const fetchDatabases = async () => {
        setLoadingDatabases(true);
        try {
            const response = await fetch('/api/db-manager/list');
            const data = await response.json();
            if (data.success && data.databases) {
                // Only show databases with valid schema
                setDatabases(data.databases
                    .filter((db: { hasValidSchema?: boolean }) => db.hasValidSchema !== false)
                    .map((db: { name: string, hasValidSchema?: boolean }) => ({
                        name: db.name,
                        hasValidSchema: true
                    })));
            }
        } catch (error) {
            console.error('Failed to fetch databases:', error);
        } finally {
            setLoadingDatabases(false);
        }
    };

    const handleSelectDatabase = async (dbName: string, hasValidSchema: boolean = true) => {
        // Don't do anything if selecting the same database
        if (dbName === selectedDatabase) {
            setShowDbDropdown(false);
            return;
        }

        // If schema is invalid, show confirmation dialog
        if (!hasValidSchema) {
            setPendingDatabase(dbName);
            setInvalidSchemaDialogOpen(true);
            setShowDbDropdown(false);
            return;
        }

        // Show master password validation modal
        setPendingDatabase(dbName);
        setDbSwitchDialogOpen(true);
        setShowDbDropdown(false);
    };

    const verifyMasterPasswordAndSwitch = async () => {
        if (!dbSwitchPassword) {
            setDbSwitchError(t('database.enterPassword') || 'Masukkan master password');
            return;
        }

        setVerifyingPassword(true);
        setDbSwitchError('');

        try {
            // Verify master password
            const response = await fetch('/api/db-manager/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: dbSwitchPassword })
            });

            const data = await response.json();

            if (!data.success) {
                setDbSwitchError(t('database.wrongPassword') || 'Master password salah');
                setVerifyingPassword(false);
                return;
            }

            // Password verified, now switch database
            setVerifyingPassword(false);
            setSwitchingDatabase(true);

            await performDatabaseSwitch(pendingDatabase);
            setDbSwitchDialogOpen(false);
            setDbSwitchPassword('');
            setPendingDatabase('');
        } catch (error) {
            console.error('Password verification error:', error);
            setDbSwitchError(t('database.verifyError') || 'Gagal memverifikasi password');
            setVerifyingPassword(false);
            setSwitchingDatabase(false);
        }
    };

    const performDatabaseSwitch = async (dbName: string) => {
        try {
            const response = await fetch('/api/db-manager/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ databaseName: dbName })
            });
            const data = await response.json();
            if (data.success) {
                setSelectedDatabase(dbName);
                setShowDbDropdown(false);
                // Add small delay to ensure cookies are set, then redirect
                setTimeout(() => {
                    window.location.href = '/login';
                }, 300);
            }
        } catch (error) {
            console.error('Failed to select database:', error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.sql')) {
                setError('File harus berformat .sql');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleRestore = async () => {
        if (!selectedFile || !masterPassword) {
            setError('Pilih file dan masukkan master password');
            return;
        }

        setRestoring(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('masterPassword', masterPassword);

            const response = await fetch('/api/database/restore', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) {
                if (result.error === 'Wrong master password') {
                    throw new Error(t('database.wrongPassword') || 'Master password salah');
                }
                throw new Error(result.error || 'Restore failed');
            }

            setRestoreSuccess(true);
            setRestoreDialogOpen(false);
            setIsDatabaseEmpty(false);
            setMasterPassword('');
            setSelectedFile(null);

        } catch (error: any) {
            console.error('Restore error:', error);
            setError(error.message || t('database.restoreError') || 'Gagal memulihkan database');
        } finally {
            setRestoring(false);
        }
    };

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
        <>
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

                            {/* Database Empty Warning */}
                            {isDatabaseEmpty && (
                                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-orange-700 dark:text-orange-300 font-medium">
                                                {t('database.emptyDatabase') || 'Database kosong! Silakan restore database terlebih dahulu.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setRestoreDialogOpen(true)}
                                                className="mt-2 px-4 py-2 text-sm font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                                            >
                                                {t('database.emptyDatabaseAction') || 'Restore Database'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Restore Success */}
                            {restoreSuccess && (
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">{t('database.restoreSuccess') || 'Database Berhasil Dipulihkan'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Database Selector - Only shown when DB_LIST is enabled */}
                            {dbListEnabled && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-none">
                                        Database
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowDbDropdown(!showDbDropdown)}
                                            className="flex w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm transition-all hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Database className="h-4 w-4 text-primary" />
                                                <span className={`font-medium ${selectedDatabase ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {loadingDatabases ? 'Loading...' : (selectedDatabase || t('login.selectDatabase'))}
                                                </span>
                                                {selectedDatabase && !loadingDatabases && (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                )}
                                            </div>
                                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showDbDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showDbDropdown && (
                                            <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-48 overflow-auto">
                                                {databases.length === 0 ? (
                                                    <div className="px-3 py-2 text-sm text-slate-500">No databases available</div>
                                                ) : (
                                                    databases.map((db) => (
                                                        <button
                                                            key={db.name}
                                                            type="button"
                                                            onClick={() => handleSelectDatabase(db.name, db.hasValidSchema)}
                                                            className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedDatabase === db.name ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-slate-300'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Database className="h-4 w-4" />
                                                                {db.name}
                                                                {!db.hasValidSchema && (
                                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                                )}
                                                            </div>
                                                            {selectedDatabase === db.name && (
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Login Form */}
                            <form className="flex flex-col gap-4" onSubmit={handleLogin}>
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
                                {dbListEnabled && !selectedDatabase && (
                                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                                        <p className="flex items-center gap-2">
                                            <Database className="h-4 w-4" />
                                            Silakan pilih database terlebih dahulu sebelum login.
                                        </p>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || (dbListEnabled && !selectedDatabase)}
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
                            <div className="text-center">
                                {dbListEnabled && (
                                    <a
                                        href="/db-manager"
                                        className="text-sm text-primary hover:text-primary-dark hover:underline font-medium"
                                    >
                                        {t('login.manageDatabases')}
                                    </a>
                                )}
                                <p className={`text-xs text-slate-400 dark:text-slate-500 ${dbListEnabled ? 'mt-3' : ''}`}>
                                    &copy; Copyright 2026 - Sistem Peminjaman Alat
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Restore Dialog for Empty Database */}
            <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-orange-600" />
                            {t('database.restore') || 'Restore Database'}
                        </DialogTitle>
                        <DialogDescription>
                            {t('database.restoreDesc') || 'Pulihkan database dari file backup'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Warning */}
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {t('database.restoreWarning') || 'PERINGATAN: Proses ini akan menghapus semua data yang ada dan menggantinya dengan data dari file backup!'}
                                </p>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label>{t('database.selectFile') || 'Pilih File .sql'}</Label>
                            <div
                                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">{selectedFile.name}</span>
                                    </div>
                                ) : (
                                    <div className="text-slate-500 dark:text-slate-400">
                                        <Upload className="h-8 w-8 mx-auto mb-2" />
                                        <p className="text-sm">Klik untuk memilih file .sql</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".sql"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* Master Password */}
                        <div className="space-y-2">
                            <Label htmlFor="masterPasswordLogin">
                                {t('database.masterPassword') || 'Master Password'}
                            </Label>
                            <Input
                                id="masterPasswordLogin"
                                type="password"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder={t('database.masterPasswordPlaceholder') || 'Masukkan master password'}
                                className="dark:text-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRestoreDialogOpen(false);
                                setMasterPassword('');
                                setSelectedFile(null);
                            }}
                            disabled={restoring}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleRestore}
                            disabled={restoring || !selectedFile || !masterPassword}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {restoring ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {t('database.restoreConfirm') || 'Restore Database'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invalid Schema Warning Dialog */}
            <Dialog open={invalidSchemaDialogOpen} onOpenChange={setInvalidSchemaDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Peringatan Schema Database
                        </DialogTitle>
                        <DialogDescription>
                            Database &quot;{pendingDatabase}&quot; tidak memiliki schema yang sesuai dengan aplikasi ini. Beberapa fitur mungkin tidak berfungsi dengan benar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Apakah Anda yakin ingin melanjutkan dengan database ini?
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setInvalidSchemaDialogOpen(false);
                                setPendingDatabase('');
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                setInvalidSchemaDialogOpen(false);
                                performDatabaseSwitch(pendingDatabase);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            Lanjutkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Master Password Validation Dialog for Database Switch */}
            <Dialog open={dbSwitchDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setDbSwitchDialogOpen(false);
                    setDbSwitchPassword('');
                    setDbSwitchError('');
                    setPendingDatabase('');
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" />
                            {t('database.switchDatabase') || 'Ganti Database'}
                        </DialogTitle>
                        <DialogDescription>
                            {(t('database.switchDatabaseDesc') || 'Masukkan master password untuk mengganti ke database "{database}"').replace('{database}', pendingDatabase)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Error Message */}
                        {dbSwitchError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <p className="text-sm">{dbSwitchError}</p>
                                </div>
                            </div>
                        )}

                        {/* Master Password Input */}
                        <div className="space-y-2">
                            <Label htmlFor="dbSwitchPassword">
                                {t('database.masterPassword') || 'Master Password'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="dbSwitchPassword"
                                    type={showDbSwitchPassword ? "text" : "password"}
                                    value={dbSwitchPassword}
                                    onChange={(e) => setDbSwitchPassword(e.target.value)}
                                    placeholder={t('database.masterPasswordPlaceholder') || 'Masukkan master password'}
                                    className="dark:text-white pr-10"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && dbSwitchPassword && !verifyingPassword) {
                                            verifyMasterPasswordAndSwitch();
                                        }
                                    }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDbSwitchPassword(!showDbSwitchPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    {showDbSwitchPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDbSwitchDialogOpen(false);
                                setDbSwitchPassword('');
                                setDbSwitchError('');
                                setPendingDatabase('');
                            }}
                            disabled={verifyingPassword || switchingDatabase}
                        >
                            {t('common.cancel') || 'Batal'}
                        </Button>
                        <Button
                            onClick={verifyMasterPasswordAndSwitch}
                            disabled={verifyingPassword || switchingDatabase || !dbSwitchPassword}
                            className="bg-primary hover:bg-primary-dark text-white"
                        >
                            {verifyingPassword ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('common.verifying') || 'Memverifikasi...'}
                                </>
                            ) : switchingDatabase ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('database.switching') || 'Mengganti Database...'}
                                </>
                            ) : (
                                <>
                                    <Database className="mr-2 h-4 w-4" />
                                    {t('database.switchConfirm') || 'Ganti Database'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
