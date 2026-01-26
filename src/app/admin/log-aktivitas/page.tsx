'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Search,
    Filter,
    Download,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
    History,
    CheckSquare,
    Square
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLogs, useDeleteLogs } from '@/hooks/use-logs'
import { LogAktivitas } from '@/lib/api-client'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'

export default function LogAktivitasPage() {
    // State for search and filters
    const [searchValue, setSearchValue] = useState('')
    const [aksiFilter, setAksiFilter] = useState('')

    // Selection state
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [selectAllMode, setSelectAllMode] = useState<'page' | 'all' | null>(null)
    const [allIds, setAllIds] = useState<number[]>([])
    const [loadingAllIds, setLoadingAllIds] = useState(false)
    // Expanded rows state
    const [expandedRows, setExpandedRows] = useState<number[]>([])

    // Toggle row expansion
    const toggleRow = (id: number) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        )
    }

    // Dialog states
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    // Use hooks
    const { t, language } = useLanguage()
    const {
        logs,
        loading,
        pagination,
        refetch,
        setPage,
        setSearch,
        setAksiFilter: setAksiFilterHook,
    } = useLogs()

    const { deleteLogs, loading: deleting } = useDeleteLogs(() => {
        setIsDeleteDialogOpen(false)
        setSelectedIds([])
        refetch()
    })

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchValue)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchValue, setSearch])

    // Apply filters
    useEffect(() => {
        setAksiFilterHook(aksiFilter)
    }, [aksiFilter, setAksiFilterHook])

    // Handle delete logs
    const handleDeleteLogs = async () => {
        if (selectedIds.length === 0) return
        await deleteLogs(selectedIds)
    }

    // Generate pagination buttons
    const renderPaginationButtons = () => {
        const { page, totalPages } = pagination
        const buttons = []

        // Previous button
        buttons.push(
            <Button
                key="prev"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
        )

        // Page numbers
        const maxVisiblePages = 5
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1)
        }

        if (startPage > 1) {
            buttons.push(
                <Button
                    key={1}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg"
                    onClick={() => setPage(1)}
                >
                    1
                </Button>
            )
            if (startPage > 2) {
                buttons.push(<span key="dots1" className="px-1 text-slate-400">...</span>)
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className={`h-9 w-9 p-0 rounded-lg ${i === page
                        ? 'border-primary bg-primary/10 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                    onClick={() => setPage(i)}
                >
                    {i}
                </Button>
            )
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                buttons.push(<span key="dots2" className="px-1 text-slate-400">...</span>)
            }
            buttons.push(
                <Button
                    key={totalPages}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg"
                    onClick={() => setPage(totalPages)}
                >
                    {totalPages}
                </Button>
            )
        }

        // Next button
        buttons.push(
            <Button
                key="next"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        )

        return buttons
    }

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date)
    }

    // Checkbox logic is now handled by handleSelectAllPage function below

    const handleSelectRow = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id])
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
        }
    }

    const isAllPageSelected = logs.length > 0 && logs.every(log => selectedIds.includes(log.id))
    const isIndeterminate = logs.some(log => selectedIds.includes(log.id)) && !isAllPageSelected

    // Fetch all IDs for "Select All" feature
    const fetchAllLogIds = async () => {
        if (loadingAllIds) return
        setLoadingAllIds(true)
        try {
            const res = await fetch(`/api/log-aktivitas?limit=10000`)
            const data = await res.json()
            if (data.success && data.data) {
                const ids = data.data.map((log: LogAktivitas) => log.id)
                setAllIds(ids)
                setSelectedIds(ids)
                setSelectAllMode('all')
            }
        } catch (err) {
            console.error('Failed to fetch all log IDs:', err)
            toast.error(t('common.error'))
        } finally {
            setLoadingAllIds(false)
        }
    }

    // Clear selection
    const clearSelection = () => {
        setSelectedIds([])
        setSelectAllMode(null)
    }

    // Handle select all on current page
    const handleSelectAllPage = (checked: boolean) => {
        if (checked) {
            const allIds = logs.map(log => log.id)
            setSelectedIds(prev => Array.from(new Set([...prev, ...allIds])))
            setSelectAllMode('page')
        } else {
            const pageIds = new Set(logs.map(log => log.id))
            setSelectedIds(prev => prev.filter(id => !pageIds.has(id)))
            setSelectAllMode(null)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            {/* Main Container */}
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
                {/* Card Container Layout */}
                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1">
                    {/* Header Section */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <History className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('activityLog.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('activityLog.subtitle')}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="shadow-md transition-all rounded-md cursor-pointer"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('activityLog.delete.button', { count: selectedIds.length })}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Search */}
                        <div className="md:col-span-8 lg:col-span-9 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus-visible:ring-primary dark:text-white dark:placeholder:text-slate-400"
                                placeholder={t('activityLog.filter.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="md:col-span-4 lg:col-span-3">
                            <Select
                                value={aksiFilter || undefined}
                                onValueChange={(value) => setAksiFilter(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('activityLog.filter.allActions')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('activityLog.filter.allActions')}</SelectItem>
                                    <SelectItem value="CREATE">{t('activityLog.filter.create')}</SelectItem>
                                    <SelectItem value="UPDATE">{t('activityLog.filter.update')}</SelectItem>
                                    <SelectItem value="DELETE">{t('activityLog.filter.delete')}</SelectItem>
                                    <SelectItem value="LOGIN">{t('activityLog.filter.login')}</SelectItem>
                                    <SelectItem value="LOGOUT">{t('activityLog.filter.logout')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Selection Banner */}
                    {selectedIds.length > 0 && (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckSquare className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    {selectAllMode === 'all' ? (
                                        <><strong>{selectedIds.length}</strong> {t('activityLog.selection.from')} <strong>{pagination.total}</strong> {t('activityLog.selection.total')}</>
                                    ) : (
                                        <><strong>{selectedIds.length}</strong> {t('activityLog.selection.selected')} {t('activityLog.selection.onPage')}</>
                                    )}
                                </span>
                                {selectAllMode === 'page' && pagination.total > logs.length && (
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-0 h-auto font-semibold"
                                        onClick={fetchAllLogIds}
                                        disabled={loadingAllIds}
                                    >
                                        {loadingAllIds ? (
                                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {t('activityLog.selection.loading')}</>
                                        ) : (
                                            <>{t('activityLog.selection.selectAll', { total: pagination.total })}</>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/40 cursor-pointer"
                                onClick={clearSelection}
                            >
                                {t('activityLog.selection.cancel')}
                            </Button>
                        </div>
                    )}

                    {/* Table Container */}
                    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 relative min-h-[460px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <History className="h-12 w-12 text-slate-300 mb-3" />
                                <p className="text-lg font-medium">{t('activityLog.empty.title')}</p>
                                <p className="text-sm">{t('activityLog.empty.description')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 w-12">
                                            <div className="flex items-center justify-center">
                                                <label className="cursor-pointer">
                                                    <div className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${isAllPageSelected
                                                        ? 'bg-primary border-primary text-white'
                                                        : isIndeterminate
                                                            ? 'bg-primary/50 border-primary/50 text-white'
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 hover:border-primary/50'
                                                        }`}>
                                                        {(isAllPageSelected || isIndeterminate) && <CheckSquare className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isAllPageSelected}
                                                        onChange={(e) => handleSelectAllPage(e.target.checked)}
                                                    />
                                                </label>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('activityLog.header.user')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('activityLog.header.action')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('activityLog.header.table')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('activityLog.header.description')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t('activityLog.header.time')}</th>
                                        <th className="px-6 py-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {logs.map((log, index) => (
                                        <React.Fragment key={log.id}>
                                            <tr
                                                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${selectedIds.includes(log.id) ? 'bg-blue-50 dark:bg-blue-900/20' :
                                                    expandedRows.includes(log.id) ? 'bg-slate-50 dark:bg-slate-800/50' :
                                                        index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''
                                                    }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center">
                                                        <label className="cursor-pointer">
                                                            <div className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${selectedIds.includes(log.id)
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 hover:border-primary/50'
                                                                }`}>
                                                                {selectedIds.includes(log.id) && <CheckSquare className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={selectedIds.includes(log.id)}
                                                                onChange={(e) => handleSelectRow(log.id, e.target.checked)}
                                                            />
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">#{String(log.id).padStart(3, '0')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {log.user ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{log.user.nama}</span>
                                                            <span className="text-xs text-slate-500">{log.user.role}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400 italic">System / Deleted</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full border ${log.aksi === 'CREATE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                        log.aksi === 'UPDATE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                            log.aksi === 'DELETE' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                log.aksi === 'LOGIN' ? 'bg-primary/10 text-primary border-primary/20 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700' :
                                                                    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                                        }`}>
                                                        {log.aksi}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">{log.tabel || '-'}</span>
                                                        {log.recordId && <span className="text-xs text-slate-500">ID: {log.recordId}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.deskripsi || ''}>
                                                    {log.deskripsi}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-500 dark:text-slate-400">
                                                    {formatDate(log.createdAt)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                                                        onClick={() => toggleRow(log.id)}
                                                    >
                                                        <ChevronDown
                                                            className={`h-4 w-4 transition-transform duration-200 ${expandedRows.includes(log.id) ? 'rotate-180 text-primary' : ''
                                                                }`}
                                                        />
                                                    </Button>
                                                </td>
                                            </tr>
                                            {/* Detail Row */}
                                            {expandedRows.includes(log.id) && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <td colSpan={9} className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm p-4 rounded-lg bg-white dark:bg-slate-800 border-l-4 border-primary shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                                        {t('activityLog.detail.title')}
                                                                    </div>
                                                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-700/50">
                                                                        {log.deskripsi || t('activityLog.detail.noDescription')}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                                        {t('activityLog.detail.entity')}
                                                                    </div>
                                                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-700/50 space-y-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-slate-900 dark:text-white min-w-[80px]">{t('activityLog.detail.table')}</span>
                                                                            <span className="font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs">{log.tabel || '-'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-slate-900 dark:text-white min-w-[80px]">{t('activityLog.detail.recordId')}</span>
                                                                            <span className="font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs">#{log.recordId || '-'}</span>
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
                                                                            <span className="block text-xs text-slate-500 mb-1">{t('activityLog.detail.ipAddress')}</span>
                                                                            <span className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-xs inline-block">{log.ipAddress || '-'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="block text-xs text-slate-500 mb-1">{t('activityLog.detail.serverTime')}</span>
                                                                            <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">{new Date(log.createdAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                                        {t('activityLog.detail.userStamp')}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm">
                                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-primary/20 dark:ring-primary/20">
                                                                            {log.user?.nama?.charAt(0).toUpperCase() || '?'}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium text-slate-900 dark:text-white text-sm">{log.user?.nama || 'System'}</div>
                                                                            <div className="text-xs text-slate-500">{log.user?.email || '-'}</div>
                                                                            <div className="text-[10px] text-primary dark:text-blue-400 font-medium mt-0.5 bg-primary/10 dark:bg-blue-900/30 px-1.5 py-0.5 rounded inline-block">
                                                                                {log.user?.role || 'SYSTEM'}
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
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between rounded-b-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {t('common.showing')} <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {logs.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}-{Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span> {t('common.of')} <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</span> {t('common.data')}
                        </div>
                        <div className="flex items-center space-x-2">
                            {renderPaginationButtons()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('activityLog.delete.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('activityLog.delete.confirm', { count: selectedIds.length })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t('activityLog.delete.cancel')}</Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeleteLogs}
                            disabled={deleting}
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('activityLog.delete.confirmAction')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
