'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Plus,
    Search,
    Filter,
    Download,
    Eye,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Edit,
    AlertCircle,
    Wrench,
    CheckCircle2,
    RotateCcw,
    Printer,
    FileSpreadsheet,
    FileText,
    CheckSquare
} from 'lucide-react'
import {
    usePengembalian,
    usePeminjamanAktif,
    useCreatePengembalian,
    useUpdatePengembalian,
    useDeletePengembalian
} from '@/hooks/use-pengembalian'
import { Pengembalian, PeminjamanAktif, CreatePengembalianInput } from '@/lib/api-client'
import { useLanguage } from '@/contexts/language-context'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { downloadReceiptPDF } from '@/lib/receipt-downloader'
import * as XLSX from 'xlsx'

// Constants
const DENDA_PER_HARI = 5000 // Rp 5.000 per day late

export default function PengembalianPage() {
    const { t, language } = useLanguage()

    // Use hooks
    const {
        data,
        loading,
        pagination,
        refetch,
        setPage,
        setSearch,
        setKondisiFilter,
        setStatusFilter,
    } = usePengembalian({ limit: 5 })

    const { data: peminjamanAktifList, refetch: refetchPeminjamanAktif } = usePeminjamanAktif()

    const { createPengembalian, loading: createLoading } = useCreatePengembalian(() => {
        refetch()
        refetchPeminjamanAktif()
        setIsAddOpen(false)
    })

    const { updatePengembalian, loading: updateLoading } = useUpdatePengembalian(() => {
        refetch()
        setEditingItem(null)
    })

    const { deletePengembalian, loading: deleteLoading } = useDeletePengembalian(() => {
        refetch()
        refetchPeminjamanAktif()
        setDeletingItem(null)
    })

    // States
    const [searchQuery, setSearchQuery] = useState('')
    const [kondisiFilter, setKondisiFilterState] = useState('')
    const [statusFilter, setStatusFilterState] = useState('')

    // Form States
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [viewingItem, setViewingItem] = useState<Pengembalian | null>(null)
    const [editingItem, setEditingItem] = useState<Pengembalian | null>(null)
    const [deletingItem, setDeletingItem] = useState<Pengembalian | null>(null)

    // Selection state for bulk delete
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [selectAllMode, setSelectAllMode] = useState<'page' | 'all' | null>(null)
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [loadingAllIds, setLoadingAllIds] = useState(false)
    const [allIds, setAllIds] = useState<number[]>([])

    // Print Preview State
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null)
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
    const [previewFileName, setPreviewFileName] = useState('')

    const [addForm, setAddForm] = useState<CreatePengembalianInput>({
        peminjamanId: 0,
        jumlahBaik: 0,
        jumlahRusak: 0,
        jumlahHilang: 0,
        keterangan: ''
    })

    // Edit form state
    const [editForm, setEditForm] = useState<{
        kondisi: 'baik' | 'rusak' | 'hilang'
        keterangan: string
        denda: number
        jumlahBaik: number
        jumlahRusak: number
        jumlahHilang: number
    }>({
        kondisi: 'baik',
        keterangan: '',
        denda: 0,
        jumlahBaik: 0,
        jumlahRusak: 0,
        jumlahHilang: 0
    })

    // Export state
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const exportColumns = [
        { key: 'no', label: 'No' },
        { key: 'kode', label: 'Kode Peminjaman' },
        { key: 'peminjam', label: 'Nama Peminjam' },
        { key: 'alat', label: 'Nama Alat' },
        { key: 'tanggalKembali', label: 'Tanggal Kembali' },
        { key: 'tanggalRencana', label: 'Tanggal Rencana' },
        { key: 'hariTerlambat', label: 'Hari Terlambat' },
        { key: 'denda', label: 'Denda' },
        { key: 'kondisi', label: 'Kondisi' },
        { key: 'keterangan', label: 'Keterangan' }
    ]
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['no', 'kode', 'peminjam', 'alat', 'tanggalKembali', 'hariTerlambat', 'denda', 'kondisi'])

    // Date range filter for export
    const [exportDateFrom, setExportDateFrom] = useState('')
    const [exportDateTo, setExportDateTo] = useState('')

    // Filter data by date range for export
    const getFilteredExportData = () => {
        let filteredData = data
        if (exportDateFrom) {
            const fromDate = new Date(exportDateFrom)
            filteredData = filteredData.filter(item => new Date(item.tanggalKembali) >= fromDate)
        }
        if (exportDateTo) {
            const toDate = new Date(exportDateTo)
            toDate.setHours(23, 59, 59, 999)
            filteredData = filteredData.filter(item => new Date(item.tanggalKembali) <= toDate)
        }
        return filteredData
    }

    // Column selection helpers
    const toggleColumn = (key: string) => {
        setSelectedColumns(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        )
    }
    const selectAllColumns = () => setSelectedColumns(exportColumns.map(c => c.key))
    const deselectAllColumns = () => setSelectedColumns([])

    // Export handlers
    const handleExportCSV = () => {
        if (selectedColumns.length === 0) return
        const filteredData = getFilteredExportData()
        const headers = exportColumns.filter(c => selectedColumns.includes(c.key)).map(c => c.label)
        const rows = filteredData.map((item, index) => {
            const row: (string | number)[] = []
            if (selectedColumns.includes('no')) row.push(index + 1)
            if (selectedColumns.includes('kode')) row.push(item.peminjaman.kode)
            if (selectedColumns.includes('peminjam')) row.push(item.user?.nama || '-')
            if (selectedColumns.includes('alat')) row.push(item.alat?.nama || '-')
            if (selectedColumns.includes('tanggalKembali')) row.push(formatDate(item.tanggalKembali))
            if (selectedColumns.includes('tanggalRencana')) row.push(formatDate(item.peminjaman.tanggalKembaliRencana))
            if (selectedColumns.includes('hariTerlambat')) row.push(item.hariTerlambat)
            if (selectedColumns.includes('denda')) row.push(item.denda)
            if (selectedColumns.includes('kondisi')) row.push(item.kondisi)
            if (selectedColumns.includes('keterangan')) row.push(item.keterangan || '-')
            return row
        })
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        const fileName = exportDateFrom && exportDateTo
            ? `Data_Pengembalian_${exportDateFrom}_${exportDateTo}.csv`
            : `Data_Pengembalian_${new Date().toISOString().split('T')[0]}.csv`
        link.download = fileName
        link.click()
        setIsExportDialogOpen(false)
    }

    const handleExportExcel = () => {
        if (selectedColumns.length === 0) return
        const filteredData = getFilteredExportData()
        const excelData = filteredData.map((item, index) => {
            const row: Record<string, string | number> = {}
            if (selectedColumns.includes('no')) row['No'] = index + 1
            if (selectedColumns.includes('kode')) row['Kode Peminjaman'] = item.peminjaman.kode
            if (selectedColumns.includes('peminjam')) row['Nama Peminjam'] = item.user?.nama || '-'
            if (selectedColumns.includes('alat')) row['Nama Alat'] = item.alat?.nama || '-'
            if (selectedColumns.includes('tanggalKembali')) row['Tanggal Kembali'] = formatDate(item.tanggalKembali)
            if (selectedColumns.includes('tanggalRencana')) row['Tanggal Rencana'] = formatDate(item.peminjaman.tanggalKembaliRencana)
            if (selectedColumns.includes('hariTerlambat')) row['Hari Terlambat'] = item.hariTerlambat
            if (selectedColumns.includes('denda')) row['Denda'] = item.denda
            if (selectedColumns.includes('kondisi')) row['Kondisi'] = item.kondisi
            if (selectedColumns.includes('keterangan')) row['Keterangan'] = item.keterangan || '-'
            return row
        })
        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengembalian')
        const fileName = exportDateFrom && exportDateTo
            ? `Data_Pengembalian_${exportDateFrom}_${exportDateTo}.xlsx`
            : `Data_Pengembalian_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(workbook, fileName)
        setIsExportDialogOpen(false)
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, setSearch])

    // Handle kondisi filter
    useEffect(() => {
        setKondisiFilter(kondisiFilter)
    }, [kondisiFilter, setKondisiFilter])

    // Handle status filter
    useEffect(() => {
        setStatusFilter(statusFilter)
    }, [statusFilter, setStatusFilter])

    // Reset add form when dialog closes
    useEffect(() => {
        if (!isAddOpen) {
            setAddForm({ peminjamanId: 0, jumlahBaik: 0, jumlahRusak: 0, jumlahHilang: 0, keterangan: '' })
        }
    }, [isAddOpen])

    // Set edit form when editing item changes
    useEffect(() => {
        if (editingItem) {
            setEditForm({
                kondisi: editingItem.kondisi,
                keterangan: editingItem.keterangan,
                denda: editingItem.denda,
                jumlahBaik: editingItem.jumlahBaik ?? 0,
                jumlahRusak: editingItem.jumlahRusak ?? 0,
                jumlahHilang: editingItem.jumlahHilang ?? 0
            })
        }
    }, [editingItem])

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Calculate late days and fine for ADD form
    const selectedPeminjaman = useMemo(() => {
        return peminjamanAktifList.find(p => p.id === addForm.peminjamanId)
    }, [addForm.peminjamanId, peminjamanAktifList])

    const addFormCalculations = useMemo(() => {
        if (!selectedPeminjaman) return { hariTerlambat: 0, denda: 0 }

        const tanggalKembaliRencana = new Date(selectedPeminjaman.tanggalKembaliRencana)
        const todayDate = new Date(today)

        const diffTime = todayDate.getTime() - tanggalKembaliRencana.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const hariTerlambat = diffDays > 0 ? diffDays : 0
        const denda = hariTerlambat * DENDA_PER_HARI

        return { hariTerlambat, denda }
    }, [selectedPeminjaman, today])

    // Formatters
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    // Checkbox selection handlers
    const handleSelectRow = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id])
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
        }
    }

    const isAllPageSelected = data.length > 0 && data.every(item => selectedIds.includes(item.id))
    const isIndeterminate = data.some(item => selectedIds.includes(item.id)) && !isAllPageSelected

    const handleSelectAllPage = (checked: boolean) => {
        if (checked) {
            const allIds = data.map(item => item.id)
            setSelectedIds(prev => Array.from(new Set([...prev, ...allIds])))
            setSelectAllMode('page')
        } else {
            const pageIds = new Set(data.map(item => item.id))
            setSelectedIds(prev => prev.filter(id => !pageIds.has(id)))
            setSelectAllMode(null)
        }
    }

    const clearSelection = () => {
        setSelectedIds([])
        setSelectAllMode(null)
    }

    // Fetch all IDs for "Select All" feature
    const fetchAllIds = async () => {
        if (loadingAllIds) return
        setLoadingAllIds(true)
        try {
            const res = await fetch(`/api/pengembalian?limit=10000`)
            const result = await res.json()
            if (result.success && result.data) {
                const ids = result.data.map((item: Pengembalian) => item.id)
                setAllIds(ids)
                setSelectedIds(ids)
                setSelectAllMode('all')
            }
        } catch (err) {
            console.error('Failed to fetch all IDs:', err)
        } finally {
            setLoadingAllIds(false)
        }
    }

    // Bulk delete handler
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return

        setBulkDeleting(true)
        try {
            const response = await fetch('/api/pengembalian/bulk-delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            })
            const result = await response.json()

            if (result.success) {
                setIsBulkDeleteDialogOpen(false)
                setSelectedIds([])
                setSelectAllMode(null)
                refetch()
            }
        } catch (error) {
            console.error('Bulk delete error:', error)
        } finally {
            setBulkDeleting(false)
        }
    }

    const getStatusBadge = (hariTerlambat: number) => {
        if (hariTerlambat > 0) {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-current/20">
                    {t('returns.status.late')}
                </span>
            )
        }
        return (
            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-current/20">
                {t('returns.status.onTime')}
            </span>
        )
    }

    const getKondisiBadge = (kondisi: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            baik: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: t('returns.condition.good') },
            rusak: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: t('returns.condition.damaged') },
            hilang: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: t('returns.condition.lost') },
        }
        const style = config[kondisi] || { bg: 'bg-gray-100', text: 'text-gray-700', label: kondisi }
        return (
            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded ${style.bg} ${style.text} border border-current/20 uppercase tracking-wide`}>
                {style.label}
            </span>
        )
    }

    // Pagination
    const { page: currentPage, totalPages } = pagination

    const renderPaginationButtons = () => {
        const buttons = []
        buttons.push(
            <Button
                key="prev"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
        )

        for (let i = 1; i <= totalPages; i++) {
            buttons.push(
                <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className={`h-9 w-9 p-0 rounded-lg ${i === currentPage
                        ? 'border-primary bg-primary/10 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                    onClick={() => setPage(i)}
                >
                    {i}
                </Button>
            )
        }

        buttons.push(
            <Button
                key="next"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        )
        return buttons
    }

    const handleAddSubmit = async () => {
        await createPengembalian(addForm)
    }

    const handleEditSubmit = async () => {
        if (editingItem) {
            await updatePengembalian(editingItem.id, editForm)
        }
    }

    const handleDelete = async () => {
        if (deletingItem) {
            await deletePengembalian(deletingItem.id)
        }
    }

    // Print Return Receipt
    const handlePrintReturnReceipt = async (item: Pengembalian) => {
        // Direct download
        const isLate = item.hariTerlambat > 0
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${t('returns.printReceiptTitle')} - ${item.peminjaman.kode}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                        padding: 20px; 
                        background: #fff; 
                        color: #111; 
                        line-height: 1.5;
                        -webkit-print-color-adjust: exact;
                    }
                    .container { 
                        max-width: 800px; 
                        margin: 0 auto; 
                    }
                    .header { 
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #000;
                    }
                    .brand h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; margin-bottom: 4px; }
                    .brand p { font-size: 14px; color: #555; }
                    
                    .meta { text-align: right; }
                    .meta-item { margin-bottom: 4px; }
                    .meta-label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; letter-spacing: 0.5px; }
                    .meta-value { font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace; }

                    .section-title { 
                        font-size: 12px; 
                        font-weight: 700; 
                        text-transform: uppercase; 
                        letter-spacing: 1px; 
                        color: #000; 
                        border-bottom: 1px solid #000; 
                        padding-bottom: 8px; 
                        margin: 30px 0 20px 0; 
                    }

                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    
                    .info-group { margin-bottom: 16px; }
                    .label { font-size: 11px; color: #666; margin-bottom: 4px; }
                    .value { font-size: 15px; font-weight: 500; color: #000; }

                    .main-info { 
                        background: #f9fafb; 
                        padding: 24px; 
                        border-radius: 8px; 
                        margin-bottom: 30px; 
                        border: 1px solid #e5e7eb;
                    }
                    .main-info .value { font-size: 18px; font-weight: 600; }

                    .status-box {
                        margin: 40px 0;
                        padding: 16px;
                        border: 1px solid #000;
                        text-align: center;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        font-size: 14px;
                    }
                    
                    .fine-box {
                        margin: 20px 0;
                        padding: 20px;
                        background: #fef2f2;
                        border: 1px solid #dc2626;
                        color: #dc2626;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .fine-label { font-size: 12px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
                    .fine-amount { font-size: 24px; font-weight: 800; }

                    .signature-area { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
                    .signature-box { text-align: center; }
                    .signature-line { border-bottom: 1px solid #000; height: 80px; margin-bottom: 8px; }
                    .signature-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }

                    .footer { 
                        margin-top: 60px; 
                        padding-top: 20px; 
                        border-top: 1px solid #e5e7eb; 
                        display: flex; 
                        justify-content: space-between; 
                        color: #666; 
                        font-size: 12px; 
                    }
                    
                    @media print { 
                        @page {
                            size: A4 portrait;
                            margin: 10mm;
                        }
                        body { padding: 0; } 
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="brand">
                            <h1>${t('returns.printReceiptTitle')}</h1>
                            <p>${t('returns.printReceiptSubtitle')}</p>
                        </div>
                        <div class="meta">
                            <div class="meta-item">
                                <div class="meta-label">${t('loans.loanCode') || 'Kode Pinjam'}</div>
                                <div class="meta-value">${item.peminjaman.kode}</div>
                            </div>
                            <div class="meta-item" style="margin-top: 12px;">
                                <div class="meta-label">${t('returns.actualReturn')}</div>
                                <div class="meta-value">${formatDate(item.tanggalKembali)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="main-info">
                        <div class="grid">
                            <div class="info-group">
                                <div class="label">${t('returns.tool')}</div>
                                <div class="value">${item.alat.nama}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.alat.kode}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('returns.borrower')}</div>
                                <div class="value">${item.user.nama}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.user.email}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section-title">${t('common.details')}</div>
                    
                    <div class="grid">
                        <div>
                            <div class="info-group">
                                <div class="label">${t('returns.loanDate')}</div>
                                <div class="value">${formatDate(item.peminjaman.tanggalPinjam)}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('returns.plannedReturn')}</div>
                                <div class="value">${formatDate(item.peminjaman.tanggalKembaliRencana)}</div>
                            </div>
                        </div>
                        <div>
                            <div class="info-group">
                                <div class="label">${t('catalog.condition')}</div>
                                <div class="value">${item.kondisi}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('returns.lateDays')}</div>
                                <div class="value">${item.hariTerlambat} ${t('returns.days')}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${item.keterangan ? `
                    <div class="info-group" style="margin-top: 20px;">
                        <div class="label">${t('returns.notes')}</div>
                        <div class="value" style="font-style: italic;">"${item.keterangan}"</div>
                    </div>
                    ` : ''}

                    <div class="status-box">
                       ${isLate ? t('returns.status.late').toUpperCase() : t('returns.status.onTime').toUpperCase()}
                    </div>
                    
                    ${item.denda > 0 ? `
                    <div class="fine-box">
                        <div class="fine-label">${t('returns.fine')}</div>
                        <div class="fine-amount">${formatCurrency(item.denda)}</div>
                    </div>
                    ` : ''}

                    <div class="signature-area">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">${t('returns.borrowerSignature')}</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">${t('returns.officerSignature')}</div>
                        </div>
                    </div>

                    <div class="footer">
                        <div>Generated by Sistem Peminjaman Alat</div>
                        <div>${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: language === 'id' ? idLocale : undefined })}</div>
                    </div>
                </div>
            </body>
            </html>
        `

        const fileName = `Bukti_Pengembalian_${item.peminjaman.kode}.pdf`
        const url = await downloadReceiptPDF(htmlContent, fileName, true)
        if (url && typeof url === 'string') {
            setPrintPreviewUrl(url)
            setPreviewFileName(fileName)
            setIsPrintPreviewOpen(true)
        }
    }

    // Late days input component
    const LateInput = ({ days }: { days: number }) => {
        return (
            <Input
                readOnly
                value={days > 0 ? `${days} ${t('returns.days')} ` : `0 ${t('returns.days')} `}
                className={`cursor - not - allowed font - medium ${days > 0
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                    } `}
            />
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
                {/* Card Container Layout */}
                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1">
                    {/* Header Section */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <RotateCcw className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('returns.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('returns.subtitle')}
                            </p>
                        </div>

                        {/* Add Dialog */}
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md cursor-pointer">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('returns.processReturn')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>{t('returns.processReturnTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('returns.processReturnDesc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                    {/* Pilih Peminjaman */}
                                    <div className="space-y-2">
                                        <Label>{t('returns.form.selectLoanLabel')} <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={addForm.peminjamanId ? addForm.peminjamanId.toString() : '0'}
                                            onValueChange={(value) => setAddForm(prev => ({ ...prev, peminjamanId: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
                                                <SelectValue placeholder={t('returns.selectTransaction')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0" disabled>{t('returns.selectTransaction')}</SelectItem>
                                                {peminjamanAktifList.map(p => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.kode} - {p.user.nama} ({p.alat.nama})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Detailed Preview Selected Loan */}
                                    {selectedPeminjaman && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                            {/* Info Alat & Peminjam */}
                                            <div className="flex gap-4">
                                                <div className="h-20 w-20 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden flex-shrink-0 border border-slate-300 dark:border-slate-600">
                                                    {(selectedPeminjaman.alat as any).gambar ? (
                                                        <img
                                                            src={(selectedPeminjaman.alat as any).gambar}
                                                            alt="alat"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=No+Img')}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <Wrench className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white truncate">{selectedPeminjaman.alat.nama}</h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-1">{(selectedPeminjaman.alat as any).kode}</p>
                                                        </div>
                                                        <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                            {selectedPeminjaman.kode}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-2 grid grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="text-xs text-slate-400 block">{t('returns.table.borrower')}</span>
                                                            <span className="font-medium truncate block" title={selectedPeminjaman.user.nama}>{selectedPeminjaman.user.nama}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-slate-400 block">{t('returns.loanDate')}</span>
                                                            <span className="font-medium">{formatDate(selectedPeminjaman.tanggalPinjam)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-slate-400 block">{t('returns.plannedReturn')}</span>
                                                            <span className="font-medium text-blue-600 dark:text-blue-400">{formatDate(selectedPeminjaman.tanggalKembaliRencana)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Keterlambatan UI Baru */}
                                            {addFormCalculations.hariTerlambat > 0 ? (
                                                <div className="flex items-start gap-3 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300">
                                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm font-bold">{t('returns.status.lateMessage', { days: addFormCalculations.hariTerlambat })}</p>
                                                        <p className="text-xs opacity-90">
                                                            {t('returns.status.lateFine', { amount: formatCurrency(addFormCalculations.denda) })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                                    <span className="text-sm font-medium">{t('returns.status.onTimeMessage')}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Tanggal Pengembalian (Readonly) */}
                                        <div className="space-y-2">
                                            <Label>{t('returns.returnDate')}</Label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <RotateCcw className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <Input
                                                    type="text"
                                                    value={formatDate(today)}
                                                    readOnly
                                                    className="pl-10 bg-slate-100 dark:bg-slate-700 cursor-not-allowed font-medium text-slate-700 dark:text-slate-300"
                                                />
                                            </div>
                                        </div>

                                        {/* Per-Unit Kondisi Alat */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>{t('returns.form.conditionLabel')} <span className="text-red-500">*</span></Label>
                                                {selectedPeminjaman && (
                                                    <span className={`text - xs font - medium px - 2 py - 0.5 rounded ${(addForm.jumlahBaik || 0) + (addForm.jumlahRusak || 0) + (addForm.jumlahHilang || 0) === selectedPeminjaman.jumlah
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        } `}>
                                                        {(addForm.jumlahBaik || 0) + (addForm.jumlahRusak || 0) + (addForm.jumlahHilang || 0)} / {selectedPeminjaman.jumlah} unit
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-emerald-600 dark:text-emerald-400">{t('returns.condition.good')}</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={addForm.jumlahBaik || 0}
                                                        onChange={(e) => setAddForm(prev => ({ ...prev, jumlahBaik: parseInt(e.target.value) || 0 }))}
                                                        className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-orange-600 dark:text-orange-400">{t('returns.condition.damaged')}</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={addForm.jumlahRusak || 0}
                                                        onChange={(e) => setAddForm(prev => ({ ...prev, jumlahRusak: parseInt(e.target.value) || 0 }))}
                                                        className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-red-600 dark:text-red-400">{t('returns.condition.lost')}</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={addForm.jumlahHilang || 0}
                                                        onChange={(e) => setAddForm(prev => ({ ...prev, jumlahHilang: parseInt(e.target.value) || 0 }))}
                                                        className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 focus:border-red-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keterangan */}
                                    <div className="space-y-2">
                                        <Label>{t('returns.form.notesLabel')}</Label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            placeholder={t('returns.form.notesPlaceholder')}
                                            value={addForm.keterangan}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, keterangan: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className='cursor-pointer'>{t('common.cancel')}</Button>
                                    </DialogClose>
                                    <Button
                                        onClick={handleAddSubmit}
                                        disabled={
                                            !addForm.peminjamanId ||
                                            createLoading ||
                                            (selectedPeminjaman && (addForm.jumlahBaik || 0) + (addForm.jumlahRusak || 0) + (addForm.jumlahHilang || 0) !== selectedPeminjaman.jumlah)
                                        }
                                        className="dark:bg-primary dark:text-white dark:hover:bg-primary/90 cursor-pointer"
                                    >
                                        {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('returns.saveReturn')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="relative flex-1 w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus-visible:ring-primary w-full"
                                placeholder={t('returns.filter.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-[180px]">
                            <Select
                                value={kondisiFilter || undefined}
                                onValueChange={(value) => setKondisiFilterState(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('common.allCondition')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.allCondition')}</SelectItem>
                                    <SelectItem value="baik">{t('returns.condition.good')}</SelectItem>
                                    <SelectItem value="rusak">{t('returns.condition.damaged')}</SelectItem>
                                    <SelectItem value="hilang">{t('returns.condition.lost')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-[180px]">
                            <Select
                                value={statusFilter || undefined}
                                onValueChange={(value) => setStatusFilterState(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('common.allStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                                    <SelectItem value="tepat_waktu">{t('returns.status.onTime')}</SelectItem>
                                    <SelectItem value="terlambat">{t('returns.status.late')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Export Button */}
                        <div className="w-full md:w-auto">
                            <Button
                                variant="outline"
                                className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 w-full md:w-auto cursor-pointer"
                                onClick={() => setIsExportDialogOpen(true)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>

                    {/* Selection Banner */}
                    {selectedIds.length > 0 && (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckSquare className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    {selectAllMode === 'all' ? (
                                        <><strong>{selectedIds.length}</strong> {t('returns.selection.from')} <strong>{pagination.total}</strong> {t('returns.selection.total')}</>
                                    ) : (
                                        <><strong>{selectedIds.length}</strong> {t('returns.selection.selected')} {t('returns.selection.onPage')}</>
                                    )}
                                </span>
                                {selectAllMode === 'page' && pagination.total > data.length && (
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-0 h-auto font-semibold"
                                        onClick={fetchAllIds}
                                        disabled={loadingAllIds}
                                    >
                                        {loadingAllIds ? (
                                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {t('returns.selection.loading')}</>
                                        ) : (
                                            <>{t('returns.selection.selectAll', { total: pagination.total })}</>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                                    className="shadow-md transition-all rounded-md cursor-pointer"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('common.delete')} ({selectedIds.length})
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/40 cursor-pointer"
                                    onClick={clearSelection}
                                >
                                    {t('returns.selection.cancel')}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 relative min-h-[460px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <p className="text-lg font-medium">{t('returns.noData')}</p>
                                <p className="text-sm">{t('returns.noDataDesc')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 w-12">
                                            <div className="flex items-center justify-center">
                                                <label className="cursor-pointer">
                                                    <div className={`flex items - center justify - center w - 5 h - 5 rounded border transition - all ${isAllPageSelected
                                                        ? 'bg-primary border-primary text-white'
                                                        : isIndeterminate
                                                            ? 'bg-primary/50 border-primary/50 text-white'
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 hover:border-primary/50'
                                                        } `}>
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
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.table.loanNo')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.table.borrower')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.table.tool')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loans.quantity')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.table.returnDate')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.table.fine')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('returns.table.status')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('returns.table.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {data.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={`hover: bg - slate - 50 dark: hover: bg - slate - 700 / 50 transition - colors group ${selectedIds.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''} `}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    <label className="cursor-pointer">
                                                        <div className={`flex items - center justify - center w - 5 h - 5 rounded border transition - all ${selectedIds.includes(item.id)
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 hover:border-primary/50'
                                                            } `}>
                                                            {selectedIds.includes(item.id) && <CheckSquare className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={selectedIds.includes(item.id)}
                                                            onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                                                        />
                                                    </label>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-sm font-semibold text-primary dark:text-blue-200">{item.peminjaman.kode}</span>
                                                    <span className="text-xs text-slate-400">Tgl: {formatDate(item.peminjaman.tanggalPinjam)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                                                        {item.user.nama.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.user.nama}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{item.alat.nama}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.alat.kode}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                    {item.peminjaman.jumlah || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex flex-col">
                                                    <span>{formatDate(item.tanggalKembali)}</span>
                                                    <span className="text-xs text-slate-400">Rencana: {formatDate(item.peminjaman.tanggalKembaliRencana)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.denda > 0 ? (
                                                    <span className="text-red-600 dark:text-red-300 font-medium text-sm bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/30">
                                                        {formatCurrency(item.denda)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="space-y-1">
                                                    <div>{getStatusBadge(item.hariTerlambat)}</div>
                                                    <div className="flex flex-wrap justify-center gap-1">
                                                        {item.jumlahBaik !== undefined && item.jumlahBaik !== null && item.jumlahBaik > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                {item.jumlahBaik} {t('returns.condition.good')}
                                                            </span>
                                                        )}
                                                        {item.jumlahRusak !== undefined && item.jumlahRusak !== null && item.jumlahRusak > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                                {item.jumlahRusak} {t('returns.condition.damaged')}
                                                            </span>
                                                        )}
                                                        {item.jumlahHilang !== undefined && item.jumlahHilang !== null && item.jumlahHilang > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                {item.jumlahHilang} {t('returns.condition.lost')}
                                                            </span>
                                                        )}
                                                        {(item.jumlahBaik === undefined || item.jumlahBaik === null) &&
                                                            (item.jumlahRusak === undefined || item.jumlahRusak === null) &&
                                                            (item.jumlahHilang === undefined || item.jumlahHilang === null) && (
                                                                getKondisiBadge(item.kondisi)
                                                            )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-primary"
                                                        onClick={() => setViewingItem(item)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                        onClick={() => handlePrintReturnReceipt(item)}
                                                        title={t('returns.printReceipt')}
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 dark:text-blue-400 hover:text-blue-400 hover:bg-blue-50"
                                                        onClick={() => setEditingItem(item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => setDeletingItem(item)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between rounded-b-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {t('common.showing')} <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {pagination.total > 0 ? ((currentPage - 1) * pagination.limit) + 1 : 0}-{Math.min(currentPage * pagination.limit, pagination.total)}
                            </span> {t('common.of')} <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</span> {t('common.data')}
                        </div>
                        <div className="flex items-center space-x-2">
                            {renderPaginationButtons()}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Detail Dialog */}
            <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('returns.detail.title')}</DialogTitle>
                        <DialogDescription>{t('returns.detail.description')}</DialogDescription>
                    </DialogHeader>
                    {viewingItem && (
                        <div className="grid gap-4 py-4">
                            {/* Header with code and status */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('returns.detail.loanNo')}</p>
                                    <p className="font-mono font-bold text-primary dark:text-blue-200">{viewingItem.peminjaman.kode}</p>
                                </div>
                                {getStatusBadge(viewingItem.hariTerlambat)}
                            </div>

                            {/* Peminjam & Alat */}
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.table.borrower')}</Label>
                                <div className="col-span-2 font-medium">
                                    {viewingItem.user.nama}
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">{viewingItem.user.email}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.table.tool')}</Label>
                                <div className="col-span-2 font-medium">
                                    {viewingItem.alat.nama}
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">{viewingItem.alat.kode}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.loanDate')}</Label>
                                <div className="col-span-2 text-sm">
                                    {formatDate(viewingItem.peminjaman.tanggalPinjam)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.plannedReturn')}</Label>
                                <div className="col-span-2 text-sm text-slate-500">
                                    {formatDate(viewingItem.peminjaman.tanggalKembaliRencana)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.detail.realReturn')}</Label>
                                <div className="col-span-2 text-sm font-medium">
                                    {formatDate(viewingItem.tanggalKembali)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.detail.endCondition')}</Label>
                                <div className="col-span-2 flex flex-wrap gap-1">
                                    {viewingItem.jumlahBaik !== undefined && viewingItem.jumlahBaik !== null && viewingItem.jumlahBaik > 0 && (
                                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {viewingItem.jumlahBaik} {t('returns.condition.good')}
                                        </span>
                                    )}
                                    {viewingItem.jumlahRusak !== undefined && viewingItem.jumlahRusak !== null && viewingItem.jumlahRusak > 0 && (
                                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                            {viewingItem.jumlahRusak} {t('returns.condition.damaged')}
                                        </span>
                                    )}
                                    {viewingItem.jumlahHilang !== undefined && viewingItem.jumlahHilang !== null && viewingItem.jumlahHilang > 0 && (
                                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                            {viewingItem.jumlahHilang} {t('returns.condition.lost')}
                                        </span>
                                    )}
                                    {(viewingItem.jumlahBaik === undefined || viewingItem.jumlahBaik === null) &&
                                        (viewingItem.jumlahRusak === undefined || viewingItem.jumlahRusak === null) &&
                                        (viewingItem.jumlahHilang === undefined || viewingItem.jumlahHilang === null) && (
                                            getKondisiBadge(viewingItem.kondisi)
                                        )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.table.fine')}</Label>
                                <div className="col-span-2 text-sm font-bold text-slate-900 dark:text-white">
                                    {viewingItem.denda > 0 ? formatCurrency(viewingItem.denda) : '-'}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-start gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400 mt-1">{t('returns.form.notesLabel')}</Label>
                                <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-100 dark:border-slate-700">
                                    {viewingItem.keterangan || '-'}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewingItem(null)} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">{t('returns.closeButton')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('returns.edit.title')}</DialogTitle>
                        <DialogDescription>
                            {t('returns.edit.description')}
                        </DialogDescription>
                    </DialogHeader>
                    {editingItem && (
                        <div className="grid gap-4 py-4 overflow-y-auto max-h-[70vh] px-1">
                            {/* No. Peminjaman (Readonly) */}
                            <div className="space-y-2">
                                <Label>{t('returns.detail.loanNo')}</Label>
                                <Input disabled value={editingItem.peminjaman.kode} className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed" />
                            </div>

                            {/* Tanggal Pengembalian (Readonly) */}
                            <div className="space-y-2">
                                <Label>{t('returns.table.returnDate')}</Label>
                                <Input
                                    type="text"
                                    value={formatDate(editingItem.tanggalKembali)}
                                    readOnly
                                    className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                                />
                            </div>

                            {/* Terlambat (Readonly with color) */}
                            <div className="space-y-2">
                                <Label>{t('returns.lateDays')}</Label>
                                <LateInput days={editingItem.hariTerlambat} />
                            </div>

                            {/* Denda (Readonly) */}
                            <div className="space-y-2">
                                <Label>{t('returns.table.fine')}</Label>
                                <Input
                                    type="number"
                                    value={editForm.denda}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, denda: parseInt(e.target.value) || 0 }))}
                                    className="bg-white dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 focus-visible:ring-primary"
                                />
                            </div>

                            {/* Kondisi Alat (Editable) - Per Unit */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>{t('returns.form.conditionLabel')} <span className="text-red-500">*</span></Label>
                                    {editingItem && (
                                        <span className={`text - xs font - medium px - 2 py - 0.5 rounded ${(editForm.jumlahBaik || 0) + (editForm.jumlahRusak || 0) + (editForm.jumlahHilang || 0) === (editingItem.peminjaman.jumlah || 1)
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            } `}>
                                            {(editForm.jumlahBaik || 0) + (editForm.jumlahRusak || 0) + (editForm.jumlahHilang || 0)} / {editingItem.peminjaman.jumlah || 1} unit
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-emerald-600 dark:text-emerald-400">{t('returns.condition.good')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={editForm.jumlahBaik || 0}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, jumlahBaik: parseInt(e.target.value) || 0 }))}
                                            className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-orange-600 dark:text-orange-400">{t('returns.condition.damaged')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={editForm.jumlahRusak || 0}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, jumlahRusak: parseInt(e.target.value) || 0 }))}
                                            className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-red-600 dark:text-red-400">{t('returns.condition.lost')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={editForm.jumlahHilang || 0}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, jumlahHilang: parseInt(e.target.value) || 0 }))}
                                            className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 focus:border-red-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Keterangan (Editable) */}
                            <div className="space-y-2">
                                <Label>{t('returns.form.notesLabel')}</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder={t('returns.form.notesPlaceholder')}
                                    value={editForm.keterangan}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, keterangan: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button onClick={handleEditSubmit} disabled={updateLoading} className="dark:bg-primary dark:text-white dark:hover:bg-primary/90 cursor-pointer">
                            {updateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('returns.saveChanges')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('returns.delete.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('returns.delete.confirm', { code: deletingItem?.peminjaman.kode || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingItem(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button onClick={handleDelete} variant="destructive" disabled={deleteLoading} className='cursor-pointer'>
                            {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('returns.delete.confirmAction')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 dark:bg-slate-950 dark:border-slate-800">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-primary dark:text-slate-100" />
                            <span className="dark:text-slate-100">Export Data Pengembalian</span>
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            Pilih kolom yang ingin diexport lalu pilih format file
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                        {/* Date Range Filter */}
                        <div className="space-y-3">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filter Rentang Tanggal</span>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">Dari Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={exportDateFrom}
                                        onChange={(e) => setExportDateFrom(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">Sampai Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={exportDateTo}
                                        onChange={(e) => setExportDateTo(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                                {getFilteredExportData().length} dari {data.length} data akan diexport
                            </p>
                        </div>

                        {/* Column Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pilih Kolom</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllColumns}
                                        className="text-xs text-primary hover:text-primary/80 dark:text-slate-300 dark:hover:text-slate-100 font-medium transition-colors"
                                    >
                                        Pilih Semua
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAllColumns}
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors"
                                    >
                                        Hapus Semua
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {exportColumns.map((col) => (
                                    <label
                                        key={col.key}
                                        className={`flex items - center gap - 3 p - 3 rounded - lg border - 2 cursor - pointer transition - all ${selectedColumns.includes(col.key)
                                            ? 'border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                                            } `}
                                    >
                                        <div className={`flex items - center justify - center w - 5 h - 5 rounded border ${selectedColumns.includes(col.key)
                                            ? 'bg-primary border-primary text-white'
                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
                                            } `}>
                                            {selectedColumns.includes(col.key) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(col.key)}
                                            onChange={() => toggleColumn(col.key)}
                                            className="hidden"
                                        />
                                        <span className={`text - sm font - medium ${selectedColumns.includes(col.key)
                                            ? 'text-primary dark:text-slate-100'
                                            : 'text-slate-700 dark:text-slate-300'
                                            } `}>
                                            {col.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                                {selectedColumns.length} dari {exportColumns.length} kolom dipilih
                            </p>
                        </div>

                        {/* Export Format Buttons */}
                        <div className="grid grid-cols-2 gap-4 pt-2 pb-2">
                            <button
                                onClick={handleExportCSV}
                                disabled={selectedColumns.length === 0}
                                className={`flex flex - col items - center justify - center p - 4 rounded - 2xl border - 2 transition - all group cursor - pointer ${selectedColumns.length === 0
                                    ? 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 bg-white dark:bg-slate-900'
                                    } `}
                            >
                                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors">
                                    <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Export CSV</span>
                                <span className="text-xs text-slate-500 dark:text-slate-500">.csv format</span>
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={selectedColumns.length === 0}
                                className={`flex flex - col items - center justify - center p - 4 rounded - 2xl border - 2 transition - all group cursor - pointer ${selectedColumns.length === 0
                                    ? 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 bg-white dark:bg-slate-900'
                                    } `}
                            >
                                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-500/10 mb-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                                    <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Export Excel</span>
                                <span className="text-xs text-slate-500">.xlsx format</span>
                            </button>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="w-full dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer">
                            {t('common.cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('common.confirmDelete')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('returns.bulkDeleteConfirm', { count: selectedIds.length })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                        >
                            {bulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Print Preview Dialog */}
            <Dialog open={isPrintPreviewOpen} onOpenChange={(open) => {
                setIsPrintPreviewOpen(open)
                if (!open && printPreviewUrl) {
                    URL.revokeObjectURL(printPreviewUrl)
                    setPrintPreviewUrl(null)
                }
            }}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{t('common.printPreview') || 'Pratinjau Cetak'}</DialogTitle>
                        <DialogDescription>{t('common.printPreviewDesc') || 'Pratinjau dokumen sebelum dicetak'}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 w-full h-full min-h-[500px] bg-slate-100 dark:bg-slate-900 rounded-md overflow-hidden">
                        {printPreviewUrl && (
                            <iframe
                                src={printPreviewUrl}
                                className="w-full h-full border-0"
                                title="Print Preview"
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={() => {
                            if (printPreviewUrl) {
                                const link = document.createElement('a');
                                link.href = printPreviewUrl;
                                link.download = previewFileName || 'document.pdf';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }
                        }}>
                            <Printer className="mr-2 h-4 w-4" />
                            {t('common.print')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
