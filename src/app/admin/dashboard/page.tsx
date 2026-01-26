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
    Layers
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDashboard } from '@/hooks/use-dashboard'
import { useLanguage } from '@/contexts/language-context'
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
import { startOfMonth, endOfMonth, subMonths, startOfYear, format, differenceInDays, differenceInMinutes, differenceInHours } from 'date-fns'

export default function AdminDashboard() {
    // Date filter state
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [quickFilter, setQuickFilter] = useState('this_month')

    // Auto-refresh state
    const [countdown, setCountdown] = useState(10)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [expandedRows, setExpandedRows] = useState<number[]>([])

    const toggleRow = (id: number) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    const { t, language } = useLanguage()
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
        const timer = setTimeout(() => {
            refetch({ startDate, endDate })
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                            </div>
                            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                            <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                    ))}
                </div>

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

    const stats = data?.stats || {
        totalUsers: 0,
        totalAlat: 0,
        activeLoans: 0,
        overdueLoans: 0,
        newAlatThisMonth: 0
    }
    const chartData = data?.chartData || []
    const categoryStats = data?.categoryStats || []
    const recentActivities = data?.recentActivities || []
    const totalAlatInCategories = categoryStats.reduce((sum, cat) => sum + cat.alatCount, 0) || stats.totalAlat

    return (
        <div className="flex flex-col flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full animate-fade-in space-y-6 text-slate-900 dark:text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                        />
                    </div>
                    <Select value={quickFilter} onValueChange={handleQuickFilterChange}>
                        <SelectTrigger className="w-[140px] h-9 text-sm">
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
                            className="h-9 w-9"
                        >
                            <RefreshCw className={`h-4 w-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Users */}
                {/* Total Users */}
                <Link href="/admin/users" className="block group">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 group-hover:scale-[1.02] transition-transform cursor-pointer h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                <Users className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalUsers')}</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                <Counter value={stats.totalUsers} />
                            </h3>
                        </div>
                    </div>
                </Link>

                {/* Total Alat */}
                {/* Total Kategori Alat */}
                <Link href="/admin/kategori" className="block group">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 group-hover:scale-[1.02] transition-transform cursor-pointer h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <Layers className="h-6 w-6" />
                            </div>
                            {/* {stats.newAlatThisMonth > 0 && (
                                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                    +{stats.newAlatThisMonth} {t('dashboard.stats.new')}
                                </span>
                            )} */}
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.totalCategories')}</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                <Counter value={categoryStats.length} />
                            </h3>
                        </div>
                    </div>
                </Link>

                {/* Active Loans */}
                {/* Active Loans */}
                <Link href="/admin/peminjaman" className="block group">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 group-hover:scale-[1.02] transition-transform cursor-pointer h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                <ClipboardList className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.activeLoans')}</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                <Counter value={stats.activeLoans} />
                            </h3>
                        </div>
                    </div>
                </Link>

                {/* Overdue Loans */}
                {/* Overdue Loans */}
                <Link href="/admin/pengembalian" className="block group">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 group-hover:scale-[1.02] transition-transform cursor-pointer h-full">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            {stats.overdueLoans > 0 && (
                                <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                                    {t('dashboard.stats.needAction')}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('dashboard.stats.overdueLoans')}</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                <Counter value={stats.overdueLoans} />
                            </h3>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center text-slate-900 dark:text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">{t('dashboard.activity.title')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('dashboard.activity.subtitle')}</p>
                        </div>
                    </div>
                    <a href="/admin/log-aktivitas" className="text-primary dark:text-blue-200 text-sm font-medium hover:underline">{t('dashboard.activity.viewAll')} →</a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">{t('dashboard.table.user')}</th>
                                <th className="px-6 py-4">{t('dashboard.table.activity')}</th>
                                <th className="px-6 py-4">{t('dashboard.table.description')}</th>
                                <th className="px-6 py-4 text-right">{t('dashboard.table.time')}</th>
                                <th className="w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {recentActivities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <p className="text-lg font-medium">{t('dashboard.table.empty')}</p>
                                        <p className="text-sm">{t('dashboard.table.emptyDesc')}</p>
                                    </td>
                                </tr>
                            ) : (
                                recentActivities.map((activity) => (
                                    <React.Fragment key={activity.id}>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${activity.color}`}>
                                                        {activity.initials}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{activity.user}</div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{activity.userRole}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {(() => {
                                                    const action = t(`dashboard.action.${activity.actionType.toLowerCase()}`)
                                                    const entity = activity.tabel ? t(`dashboard.entity.${activity.tabel.toLowerCase()}`) : ''
                                                    return entity ? `${action} ${entity}` : action
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-primary dark:text-blue-200">{activity.item}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-right">
                                                {(() => {
                                                    const date = new Date(activity.timestamp)
                                                    const now = new Date()
                                                    const diffMins = differenceInMinutes(now, date)

                                                    if (diffMins < 1) return t('dashboard.timeAgo.justNow')
                                                    if (diffMins < 60) return t('dashboard.timeAgo.minutes', { count: diffMins })

                                                    const diffHours = differenceInHours(now, date)
                                                    if (diffHours < 24) return t('dashboard.timeAgo.hours', { count: diffHours })

                                                    const diffDays = differenceInDays(now, date)
                                                    return t('dashboard.timeAgo.days', { count: diffDays })
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRow(activity.id)}>
                                                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.includes(activity.id) ? 'rotate-180' : ''}`} />
                                                </Button>
                                            </td>
                                        </tr>
                                        {expandedRows.includes(activity.id) && (
                                            <tr className="bg-slate-50 dark:bg-slate-700/30">
                                                <td colSpan={5} className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm p-4 rounded-lg bg-white dark:bg-slate-800 border-l-4 border-primary shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                                    {t('activityLog.detail.title')}
                                                                </div>
                                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-700/50">
                                                                    {activity.deskripsi || t('activityLog.detail.noDescription')}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                                    {t('activityLog.detail.entity')}
                                                                </div>
                                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-700/50 space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-slate-900 dark:text-white min-w-[80px]">{t('activityLog.detail.table')}</span>
                                                                        <span className="font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs">{activity.tabel || '-'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-slate-900 dark:text-white min-w-[80px]">{t('activityLog.detail.recordId')}</span>
                                                                        <span className="font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs">#{activity.recordId || '-'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                                    {t('activityLog.detail.technical')}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-700/50">
                                                                    <div>
                                                                        <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('activityLog.detail.ipAddress')}</span>
                                                                        <span className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs inline-block">{activity.ipAddress || '-'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('activityLog.detail.serverTime')}</span>
                                                                        <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">{new Date(activity.timestamp).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                                    {t('activityLog.detail.userStamp')}
                                                                </div>
                                                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm">
                                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-white dark:ring-slate-700 ${activity.color}`}>
                                                                        {activity.initials}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-slate-900 dark:text-white text-sm">{activity.user}</div>
                                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{activity.userEmail}</div>
                                                                        <div className="text-[10px] text-primary dark:text-blue-400 font-medium mt-0.5 bg-primary/10 dark:bg-blue-900/30 px-1.5 py-0.5 rounded inline-block">
                                                                            {activity.userRole}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
