'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/language-context'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    LayoutDashboard,
    Users,
    Wrench,
    Tags,
    ClipboardList,
    History,
    Settings,
    LogOut,
    Menu,
    Bell,
    Search,
    ChevronDown,
    CheckCircle,
    RotateCcw,
    Home,
    FileText,
    Sun,
    Moon,
    Laptop,
    Palette
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

// Navigation items per role
// Navigation items per role helper function
const getNavigationConfig = (t: (key: string) => string) => ({
    admin: [
        {
            title: t('nav.dashboard'),
            href: '/admin/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: t('nav.users'),
            href: '/admin/users',
            icon: Users,
        },
        {
            title: t('nav.tools'),
            href: '/admin/alat',
            icon: Wrench,
        },
        {
            title: t('nav.categories'),
            href: '/admin/kategori',
            icon: Tags,
        },
        {
            title: t('nav.loans'),
            href: '/admin/peminjaman',
            icon: ClipboardList,
        },
        {
            title: t('nav.returns'),
            href: '/admin/pengembalian',
            icon: RotateCcw,
        },
        {
            title: t('nav.activity'),
            href: '/admin/log-aktivitas',
            icon: History,
        },
        {
            title: t('nav.settings'),
            href: '/admin/pengaturan',
            icon: Settings,
        },
    ],
    petugas: [
        {
            title: t('nav.dashboard'),
            href: '/petugas/dashboard',
            icon: LayoutDashboard,
        },
        {
            title: t('nav.validation'),
            href: '/petugas/validasi',
            icon: CheckCircle,
        },
        {
            title: t('nav.loans'),
            href: '/petugas/peminjaman',
            icon: ClipboardList,
        },
        {
            title: t('nav.returns'),
            href: '/petugas/pengembalian',
            icon: RotateCcw,
        },
        {
            title: t('nav.reports'),
            href: '/petugas/laporan',
            icon: FileText,
        },
        {
            title: t('nav.settings'),
            href: '/petugas/pengaturan',
            icon: Settings,
        },
    ],
    peminjam: [
        {
            title: t('nav.home'),
            href: '/peminjam/beranda',
            icon: Home,
        },
        {
            title: t('nav.catalog'),
            href: '/peminjam/katalog',
            icon: Wrench,
        },
        {
            title: t('nav.myLoans'),
            href: '/peminjam/peminjaman',
            icon: ClipboardList,
        },
        {
            title: t('nav.returns'),
            href: '/peminjam/pengembalian',
            icon: RotateCcw,
        },
        {
            title: t('nav.settings'),
            href: '/peminjam/pengaturan',
            icon: Settings,
        },
    ],
})

interface DashboardLayoutProps {
    children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const { data: session } = useSession()
    const { t } = useLanguage()
    const { theme, setTheme } = useTheme()

    // Prevent hydration mismatch with Radix UI
    useEffect(() => {
        setMounted(true)
    }, [])

    // Get user data from session
    const userRole = (session?.user?.role as 'admin' | 'petugas' | 'peminjam') || 'peminjam'
    const userName = session?.user?.nama || 'User'
    const userEmail = session?.user?.email || ''

    // Get panel title based on role
    const getPanelTitle = () => {
        switch (userRole) {
            case 'admin': return t('role.admin')
            case 'petugas': return t('role.petugas')
            case 'peminjam': return t('role.peminjam')
            default: return t('nav.dashboard')
        }
    }

    // Get navigation based on role
    const navigationConfig = getNavigationConfig(t)
    const navigation = navigationConfig[userRole] || navigationConfig.peminjam;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const handleSignOut = async () => {
        try {
            // Log logout activity using our new endpoint
            await fetch('/api/auth/logout-log', { method: 'POST' });
        } catch (error) {
            console.error('Failed to log logout:', error);
        } finally {
            // Always sign out, even if logging fails
            await signOut({ callbackUrl: '/login' });
        }
    }

    // Show loading skeleton during SSR to prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
                {/* Sidebar Skeleton */}
                <aside className="hidden md:flex w-64 bg-primary dark:bg-slate-950 flex-col justify-between shrink-0">
                    <div>
                        {/* Logo Area */}
                        <div className="px-6 py-[16px] border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/10 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                        {/* Navigation Items */}
                        <div className="px-4 py-6 space-y-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-11 w-full rounded-xl bg-white/5 animate-pulse mx-3" />
                            ))}
                        </div>
                    </div>
                    {/* Logout Button */}
                    <div className="p-4 border-t border-white/10">
                        <div className="h-10 w-full rounded-lg bg-white/5 animate-pulse" />
                    </div>
                </aside>

                {/* Main Content Skeleton */}
                <main className="flex-1 flex flex-col">
                    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
                        {/* Header Title */}
                        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />

                        {/* User Profile */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block space-y-1">
                                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ml-auto" />
                            </div>
                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        </div>
                    </header>
                    <div className="flex-1 p-6">{children}</div>
                </main>
            </div>
        )
    }

    const SidebarContent = () => (
        <div className="flex h-full flex-col justify-between bg-primary dark:bg-slate-950 text-white shrink-0 transition-all duration-300">
            {/* Logo Area */}
            <div className="px-6 py-[16px] border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
                        <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-[16px] font-bold leading-tight">ToolRent</h1>
                        <p className="text-[14px] text-blue-200 font-medium tracking-wide opacity-80">{getPanelTitle()}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden mx-3 my-1',
                                isActive
                                    ? 'bg-gradient-to-r from-white/20 via-white/5 to-transparent backdrop-blur-md border-l-4 border-white text-white shadow-[0_4px_30px_rgba(0,0,0,0.1)]'
                                    : 'text-blue-100/80 hover:bg-white/5 hover:text-white border-l-4 border-transparent hover:border-white/20'
                            )}
                        >
                            {/* Glass Shine Effect for Active */}
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50" />
                            )}

                            <div className={cn("relative z-10 transition-transform duration-300",
                                isActive ? "translate-x-1" : "group-hover:translate-x-1"
                            )}>
                                <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]")} />
                            </div>
                            <span className={cn("relative z-10 text-sm font-medium tracking-wide transition-all duration-300", isActive ? "translate-x-1" : "group-hover:translate-x-1")}>
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center gap-2 rounded-md h-10 px-4 bg-white/5 text-blue-100 hover:bg-red-500/10 hover:text-red-200 border border-white/5 hover:border-red-500/20 transition-all duration-200 text-sm font-medium cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>{t('nav.logout')}</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-gray-900 font-sans antialiased overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-shrink-0 md:flex flex-col">
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
                    {/* Header */}
                    <header className="flex-shrink-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] px-6 py-[16px] flex items-center justify-between z-50 sticky top-0">
                        <div className="flex items-center gap-4">
                            {/* Mobile Menu Button */}
                            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                                <SheetTrigger asChild>
                                    <button className="md:hidden p-2 text-gray-500 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors">
                                        <Menu className="h-6 w-6" />
                                    </button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-64 p-0 border-r-0">
                                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                    <SidebarContent />
                                </SheetContent>
                            </Sheet>

                            <div className="flex flex-col">
                                <span className="hidden md:block text-xs text-gray-500 font-medium">{t('common.mainPage')}</span>
                                <h2 className="text-brand-primary dark:text-white text-xl font-bold leading-tight">
                                    {(() => {
                                        const segments = pathname.split('/')
                                        const lastSegment = segments[segments.length - 1]
                                        // Map specific paths to translation keys
                                        if (pathname.includes('/beranda') || pathname === '/peminjam') return t('nav.home')
                                        if (pathname.includes('/katalog')) return t('nav.catalog')
                                        if (pathname.includes('/peminjaman')) return t('nav.myLoans')
                                        if (pathname.includes('/pengembalian')) return t('nav.returns')
                                        if (pathname.includes('/pengaturan')) return t('nav.settings')

                                        // Admin specific
                                        if (pathname.includes('/users')) return t('nav.users')
                                        if (pathname.includes('/alat')) return t('nav.tools')
                                        if (pathname.includes('/kategori')) return t('nav.categories')
                                        if (pathname.includes('/log-aktivitas')) return t('nav.activity')

                                        // Petugas specific
                                        if (pathname.includes('/validasi')) return t('nav.validation')
                                        if (pathname.includes('/laporan')) return t('nav.reports')

                                        // Fallback to formatted path
                                        return lastSegment?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Dashboard'
                                    })()}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-6">
                            {/* Search */}
                            {/* <label className="hidden md:flex items-center h-10 w-64 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 gap-2 focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                                <Search className="h-5 w-5 text-gray-400" />
                                <input
                                    className="bg-transparent border-none outline-none text-sm w-full text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0"
                                    placeholder="Search equipment or user..."
                                    type="text"
                                />
                            </label> */}

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                {/* <button className="relative flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                                </button> */}

                                <div className="flex items-center gap-3 pl-3 border-l border-gray-200/50 dark:border-white/10">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{userName}</p>
                                        <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-1 focus:outline-none">
                                                <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer">
                                                    <AvatarImage src={session?.user?.image || undefined} className="object-cover" />
                                                    <AvatarFallback className="bg-gray-200 text-gray-600 font-bold">
                                                        {getInitials(userName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>{t('common.myAccount')}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href={`/${userRole}/pengaturan`} className="cursor-pointer w-full flex items-center">
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    {t('nav.settings')}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>{t('settings.theme')}</DropdownMenuLabel>

                                            <div className="px-2 pb-2">
                                                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 relative">
                                                    {[
                                                        { value: 'light', icon: Sun, label: t('settings.theme.light') },
                                                        { value: 'dark', icon: Moon, label: t('settings.theme.dark') },
                                                        { value: 'system', icon: Laptop, label: t('settings.theme.system') },
                                                    ].map((item) => (
                                                        <button
                                                            key={item.value}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setTheme(item.value);
                                                            }}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center p-1.5 rounded-md transition-all duration-200 relative z-10",
                                                                theme === item.value
                                                                    ? "text-brand-primary dark:text-blue-400"
                                                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                                            )}
                                                            title={item.label}
                                                        >
                                                            {theme === item.value && (
                                                                <motion.div
                                                                    layoutId="theme-active"
                                                                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm border border-slate-200/50 dark:border-slate-600"
                                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                    style={{ zIndex: -1 }}
                                                                />
                                                            )}
                                                            <item.icon className="h-4 w-4 relative z-10" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 w-full flex items-center">
                                                <LogOut className="mr-2 h-4 w-4" />
                                                {t('nav.logout')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </header>
                    {children}
                </div>
            </main>
        </div>
    )
}
