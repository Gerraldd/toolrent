'use client'

import React, { useState, useEffect } from 'react'
import {
    Users,
    Wrench,
    ClipboardList,
    AlertTriangle,
    Loader2,
    RefreshCw,
    TrendingUp,
    PieChart,
    Activity,
    Calendar,
    Filter,
    ChevronDown,
    FileCheck,
    CalendarClock,
    Banknote
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDashboard } from '@/hooks/use-dashboard'
import { DashboardChart } from '@/components/dashboard/dashboard-chart'
import { DashboardPieChart } from '@/components/dashboard/dashboard-pie-chart'
import { ZoomableChart } from '@/components/ui/zoomable-chart'
import { Counter } from '@/components/ui/counter'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns'
import { useLanguage } from '@/contexts/language-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PetugasDashboard() {
    const { t } = useLanguage()
    const router = useRouter()

    // Date filter state
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [quickFilter, setQuickFilter] = useState('this_month')

    // Auto-refresh state
    const [countdown, setCountdown] = useState(10)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const { data, loading, error, refetch } = useDashboard({ startDate, endDate })

    // Handle Quick Filter Change
    const handleQuickFilterChange = (value: string) => {
        setQuickFilter(value)
        const today = new Date()
        let start = ''
        let end = ''

        switch (value) {
            case 'today':
                start = format(today, 'yyyy-MM-dd')
                end = format(today, 'yyyy-MM-dd')
                break
            case 'this_month':
                start = format(startOfMonth(today), 'yyyy-MM-dd')
                end = format(endOfMonth(today), 'yyyy-MM-dd')
                break
            case 'last_month':
                const lastMonth = subMonths(today, 1)
                start = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
                end = format(endOfMonth(lastMonth), 'yyyy-MM-dd')
                break
            case 'this_year':
                start = format(startOfYear(today), 'yyyy-MM-dd')
                end = format(today, 'yyyy-MM-dd')
                break
            default:
                start = ''
                end = ''
        }

        setStartDate(start)
        setEndDate(end)
    }

    // Effect to refetch when filters change
    useEffect(() => {
        // Debounce slightly to avoid rapid refetches if user is typing or rendering initial state
        const timer = setTimeout(() => {
            refetch({ startDate, endDate })
            // Reset countdown when filters change
            setCountdown(10)
        }, 300)

        return () => clearTimeout(timer)
    }, [startDate, endDate, refetch])

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (!autoRefresh) return

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    refetch({ startDate, endDate })
                    return 10
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [autoRefresh, refetch, startDate, endDate])

    // Reset countdown when manual refresh
    const handleManualRefresh = async () => {
        setIsRefreshing(true)
        // Ensure minimum loading time for better UX
        await Promise.all([
            refetch({ startDate, endDate }),
            new Promise(resolve => setTimeout(resolve, 600))
        ])
        setIsRefreshing(false)
        setCountdown(10)
    }

    // Loading state
    if (loading && !data) {
        return (
            <div className="flex flex-col flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full animate-fade-in space-y-6">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                    <div>
                        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                        <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="h-9 w-[340px] bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-9 w-[140px] bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                                <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                            </div>
                            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                            <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-[400px] animate-pulse">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                            <div>
                                <div className="w-48 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                        </div>
                        <div className="w-full h-[280px] bg-slate-100 dark:bg-slate-750 rounded-xl"></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                            <div>
                                <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                        </div>
                        <div className="flex justify-center items-center h-[240px]">
                            <div className="w-48 h-48 bg-slate-200 dark:bg-slate-700 rounded-full border-8 border-slate-100 dark:border-slate-800"></div>
                        </div>
                    </div>
                </div>

                {/* Activity Skeleton */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                            <div>
                                <div className="w-40 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                        </div>
                        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="p-0">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50 dark:border-slate-700 last:border-0">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                    <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                </div>
                                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded hidden sm:block"></div>
                                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded text-right"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-red-600 text-lg">{error}</p>
                <Button onClick={() => refetch({ startDate, endDate })} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('common.tryAgain')}
                </Button>
            </div>
        )
    }

    // Destructure data
    const stats = data?.stats || {
        totalUsers: 0,
        newUsersThisMonth: 0,
        userGrowth: 0,
        activeLoans: 0, // Kept as it's used in Card 3
        overdueLoans: 0,
        pendingCount: 0,
        returnsInRangeCount: 0,
        finesInRange: 0,
        totalAlat: 0
    }
    const chartData = data?.chartData || []
    const categoryStats = data?.categoryStats || []
    const recentLoans = data?.recentLoans || []

    // Calculate total alat for pie chart center
    const totalAlatInCategories = categoryStats.reduce((sum, cat) => sum + cat.alatCount, 0) || stats.totalAlat

    return (
        <div className="flex flex-col flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full animate-fade-in space-y-6">
            {/* Dashboard Header with Date Filter and Auto-refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value)
                                setQuickFilter('custom')
                            }}
                            className="h-9 w-[160px] text-sm bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                            placeholder="Dari"
                        />
                        <span className="text-slate-400">-</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value)
                                setQuickFilter('custom')
                            }}
                            className="h-9 w-[160px] text-sm bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                            placeholder="Sampai"
                        />
                    </div>

                    {/* Quick Filter */}
                    <Select value={quickFilter} onValueChange={handleQuickFilterChange}>
                        <SelectTrigger className="w-[140px] h-9 text-sm bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5" />
                                <SelectValue placeholder={t('dashboard.filter.time')} />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('dashboard.filter.all')}</SelectItem>
                            <SelectItem value="today">{t('dashboard.filter.today')}</SelectItem>
                            <SelectItem value="this_month">{t('dashboard.filter.thisMonth')}</SelectItem>
                            <SelectItem value="last_month">{t('dashboard.filter.lastMonth')}</SelectItem>
                            <SelectItem value="this_year">{t('dashboard.filter.thisYear')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Auto-refresh indicator and button */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`text-xs ${autoRefresh ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                        >
                            {autoRefresh ? (
                                <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    {countdown}s
                                </>
                            ) : (
                                t('dashboard.autoRefresh.off')
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleManualRefresh}
                            disabled={loading || isRefreshing}
                            className="h-9 w-9 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                            title="Refresh sekarang"
                        >
                            <RefreshCw className={`h-4 w-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Perlu Validasi */}
                <div
                    onClick={() => router.push('/petugas/validasi')}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                >
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                            <FileCheck className="h-6 w-6" />
                        </div>
                        {stats.pendingCount > 0 && (
                            <span className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                                {t('dashboard.stats.waiting')}
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.pendingValidation')}</p>
                        <h3 className="text-slate-900 dark:text-white text-3xl font-bold mt-1">
                            <Counter value={stats.pendingCount} />
                        </h3>
                    </div>
                </div>

                {/* Card 2: Jadwal Pengembalian */}
                <div
                    onClick={() => router.push('/petugas/pengembalian')}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                >
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            <CalendarClock className="h-6 w-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalReturns')}</p>
                        <h3 className="text-slate-900 dark:text-white text-3xl font-bold mt-1">
                            <Counter value={stats.returnsInRangeCount} />
                        </h3>
                    </div>
                </div>

                {/* Card 3: Sedang Dipinjam */}
                <div
                    onClick={() => router.push('/petugas/peminjaman')}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                >
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.currentlyBorrowed')}</p>
                        <h3 className="text-slate-900 dark:text-white text-3xl font-bold mt-1">
                            <Counter value={stats.activeLoans} />
                        </h3>
                    </div>
                </div>

                {/* Card 4: Total Denda */}
                <div
                    onClick={() => router.push('/petugas/pengembalian')}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                >
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            <Banknote className="h-6 w-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalFines')}</p>
                        <h3 className="text-slate-900 dark:text-white text-3xl font-bold mt-1">
                            Rp <Counter value={stats.finesInRange} />
                        </h3>
                    </div>
                </div>
            </div>

            {/* Middle Section: Chart & Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Line Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <ZoomableChart
                        title={t('dashboard.chart.monthly')}
                        description={t('dashboard.chart.monthlyDesc')}
                        icon={<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                        modalClassName="max-w-[95vw] w-full min-h-[50vh] h-auto"
                    >
                        {({ isExpanded }) => (
                            <DashboardChart
                                data={chartData}
                                className={isExpanded ? "h-full min-h-[400px]" : ""}
                            />
                        )}
                    </ZoomableChart>
                </div>

                {/* Right: Pie Chart - Kategori Paling Banyak Dipinjam (1/3 width) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <ZoomableChart
                        title={t('dashboard.chart.popular')}
                        description={t('dashboard.chart.popularDesc')}
                        icon={<PieChart className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                        modalClassName="max-w-3xl w-full h-auto"
                    >
                        {({ isExpanded }) => (
                            <DashboardPieChart
                                data={categoryStats}
                                totalAlat={totalAlatInCategories}
                                className={isExpanded ? "h-[50vh] w-[50vh]" : undefined}
                            />
                        )}
                    </ZoomableChart>
                </div>
            </div>

            {/* Bottom Section: Peminjaman Terbaru (Full Width) */}
            <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                {/* Header Section */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('dashboard.recentLoans')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('dashboard.recentLoansDesc')}</p>
                        </div>
                    </div>
                    <Link href="/petugas/peminjaman" className="text-primary dark:text-blue-200 text-sm font-medium hover:underline whitespace-nowrap">
                        {t('dashboard.activity.viewAll') || 'Lihat Semua'} →
                    </Link>
                </div>

                {/* Table Container */}
                <div className="overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.table.user')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('nav.tools')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.loanDate')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.plannedReturn')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {recentLoans.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <p className="text-lg font-medium">{t('dashboard.noLoanData')}</p>
                                        <p className="text-sm">{t('dashboard.loansWillAppear')}</p>
                                    </td>
                                </tr>
                            ) : (
                                recentLoans.map((loan, index) => (
                                    <tr
                                        key={loan.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''
                                            }`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{loan.user}</span>
                                                <span className="text-xs text-slate-500">{loan.userEmail}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{loan.alat}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{loan.tanggalPinjam}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{loan.tanggalKembali}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${['dipinjam', 'borrowed'].includes(loan.status) ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900' :
                                                ['selesai', 'dikembalikan', 'completed', 'returned'].includes(loan.status) ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900' :
                                                    ['telat', 'terlambat', 'late', 'overdue'].includes(loan.status) ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900' :
                                                        'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                }`}>
                                                {['dipinjam', 'borrowed'].includes(loan.status) ? t('loans.status.borrowed') :
                                                    ['selesai', 'dikembalikan', 'completed', 'returned'].includes(loan.status) ? t('returns.status.completed') :
                                                        ['telat', 'terlambat', 'late', 'overdue'].includes(loan.status) ? t('returns.status.late') :
                                                            ['menunggu', 'pending'].includes(loan.status) ? t('loans.status.pending') :
                                                                loan.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
