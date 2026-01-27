'use client'

import { useState, useEffect } from 'react'
import { usePeminjaman, Peminjaman, CreatePeminjamanInput, UpdatePeminjamanInput } from '@/hooks/use-peminjaman'
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
    CheckCircle,
    XCircle,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    HandCoins,
    Printer,
    Edit,
    FileSpreadsheet,
    FileText,
    CheckSquare
} from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { downloadReceiptPDF } from '@/lib/receipt-downloader'
import { useLanguage } from '@/contexts/language-context'
import * as XLSX from 'xlsx'

export default function PeminjamanPage() {
    const {
        data,
        loading,
        pagination,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        currentPage,
        setCurrentPage,
        createPeminjaman,
        updatePeminjaman,
        deletePeminjaman,
        creating,
        updating,
        deleting,
        refetch,
    } = usePeminjaman()
    const { t, language } = useLanguage()

    // Local states
    const [searchValue, setSearchValue] = useState(searchQuery)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [viewingItem, setViewingItem] = useState<Peminjaman | null>(null)
    const [deletingItem, setDeletingItem] = useState<Peminjaman | null>(null)
    const [approvingItem, setApprovingItem] = useState<Peminjaman | null>(null)
    const [rejectingItem, setRejectingItem] = useState<Peminjaman | null>(null)
    const [lendingItem, setLendingItem] = useState<Peminjaman | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    // Add form state
    const [addForm, setAddForm] = useState<CreatePeminjamanInput>({
        alatId: 0,
        tanggalPinjam: new Date().toISOString().split('T')[0],
        tanggalKembaliRencana: '',
        keperluan: '',
        jumlah: 1,
    })

    // Edit form state
    const [editingItem, setEditingItem] = useState<Peminjaman | null>(null)
    const [editForm, setEditForm] = useState<UpdatePeminjamanInput>({})

    // Export state
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const exportColumns = [
        { key: 'no', label: 'No' },
        { key: 'id', label: 'ID Peminjaman' },
        { key: 'peminjam', label: 'Nama Peminjam' },
        { key: 'alat', label: 'Nama Alat' },
        { key: 'jumlah', label: 'Jumlah' },
        { key: 'tanggalPinjam', label: 'Tanggal Pinjam' },
        { key: 'tanggalKembali', label: 'Tanggal Kembali' },
        { key: 'keperluan', label: 'Keperluan' },
        { key: 'status', label: 'Status' }
    ]
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['no', 'id', 'peminjam', 'alat', 'jumlah', 'tanggalPinjam', 'tanggalKembali', 'status'])

    // Date range filter for export
    const [exportDateFrom, setExportDateFrom] = useState('')
    const [exportDateTo, setExportDateTo] = useState('')

    // Selection state for bulk delete
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [selectAllMode, setSelectAllMode] = useState<'page' | 'all' | null>(null)
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [loadingAllIds, setLoadingAllIds] = useState(false)

    // Print Preview State
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null)
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
    const [previewFileName, setPreviewFileName] = useState('')

    // Filter data by date range for export
    const getFilteredExportData = () => {
        let filteredData = data
        if (exportDateFrom) {
            const fromDate = new Date(exportDateFrom)
            filteredData = filteredData.filter(item => new Date(item.tanggalPinjam) >= fromDate)
        }
        if (exportDateTo) {
            const toDate = new Date(exportDateTo)
            toDate.setHours(23, 59, 59, 999)
            filteredData = filteredData.filter(item => new Date(item.tanggalPinjam) <= toDate)
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
            if (selectedColumns.includes('id')) row.push(item.id)
            if (selectedColumns.includes('peminjam')) row.push(item.user?.nama || '-')
            if (selectedColumns.includes('alat')) row.push(item.alat?.nama || '-')
            if (selectedColumns.includes('jumlah')) row.push(item.jumlah)
            if (selectedColumns.includes('tanggalPinjam')) row.push(formatDate(item.tanggalPinjam))
            if (selectedColumns.includes('tanggalKembali')) row.push(formatDate(item.tanggalKembaliRencana))
            if (selectedColumns.includes('keperluan')) row.push(item.keperluan || '-')
            if (selectedColumns.includes('status')) row.push(item.status)
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
            ? `Data_Peminjaman_${exportDateFrom}_${exportDateTo}.csv`
            : `Data_Peminjaman_${new Date().toISOString().split('T')[0]}.csv`
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
            if (selectedColumns.includes('id')) row['ID Peminjaman'] = item.id
            if (selectedColumns.includes('peminjam')) row['Nama Peminjam'] = item.user?.nama || '-'
            if (selectedColumns.includes('alat')) row['Nama Alat'] = item.alat?.nama || '-'
            if (selectedColumns.includes('jumlah')) row['Jumlah'] = item.jumlah
            if (selectedColumns.includes('tanggalPinjam')) row['Tanggal Pinjam'] = formatDate(item.tanggalPinjam)
            if (selectedColumns.includes('tanggalKembali')) row['Tanggal Kembali'] = formatDate(item.tanggalKembaliRencana)
            if (selectedColumns.includes('keperluan')) row['Keperluan'] = item.keperluan || '-'
            if (selectedColumns.includes('status')) row['Status'] = item.status
            return row
        })
        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Peminjaman')
        const fileName = exportDateFrom && exportDateTo
            ? `Data_Peminjaman_${exportDateFrom}_${exportDateTo}.xlsx`
            : `Data_Peminjaman_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(workbook, fileName)
        setIsExportDialogOpen(false)
    }

    // Fetch alat and users for form
    const [alatList, setAlatList] = useState<Array<{ id: number; kode: string; nama: string; stokTersedia: number; status: string }>>([])
    const [userList, setUserList] = useState<Array<{ id: number; nama: string; email: string }>>([])

    useEffect(() => {
        fetch('/api/alat?limit=100')
            .then(res => res.json())
            .then(result => {
                if (result.success) setAlatList(result.data)
            })
        fetch('/api/users?role=peminjam&limit=100')
            .then(res => res.json())
            .then(result => {
                if (result.success) setUserList(result.data)
            })
    }, [])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchValue)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchValue, setSearchQuery])

    // Status badge styles
    const getStatusBadge = (status: string, tanggalKembaliRencana?: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            menunggu: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: t('adminLoans.status.waiting') },
            disetujui: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: t('adminLoans.status.approved') },
            dipinjam: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: t('adminLoans.status.borrowed') },
            ditolak: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: t('adminLoans.status.rejected') },
            dikembalikan: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: t('adminLoans.status.returned') },
            terlambat: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: t('adminLoans.status.late') },
        }
        const style = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }

        // Calculate remaining days or overdue for 'dipinjam' status
        let daysInfo = null
        if (status === 'dipinjam' && tanggalKembaliRencana) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const returnDate = new Date(tanggalKembaliRencana)
            returnDate.setHours(0, 0, 0, 0)
            const diffTime = returnDate.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays > 0) {
                daysInfo = { text: `${diffDays} hari lagi`, isOverdue: false }
            } else if (diffDays === 0) {
                daysInfo = { text: 'Hari ini', isOverdue: false }
            } else {
                daysInfo = { text: `Terlambat ${Math.abs(diffDays)} hari`, isOverdue: true }
            }
        }

        return (
            <div className="flex flex-col items-start gap-1">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${style.bg} ${style.text} border border-current/20`}>
                    {style.label}
                </span>
                {daysInfo && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${daysInfo.isOverdue
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                        {daysInfo.text}
                    </span>
                )}
            </div>
        )
    }

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    // Reset add form
    const resetAddForm = () => {
        setAddForm({
            alatId: 0,
            tanggalPinjam: new Date().toISOString().split('T')[0],
            tanggalKembaliRencana: '',
            keperluan: '',
            jumlah: 1,
        })
    }

    // Reset edit form
    const resetEditForm = () => {
        setEditForm({})
        setEditingItem(null)
    }

    // Handlers
    const handleAddSubmit = async () => {
        if (!addForm.alatId || !addForm.tanggalPinjam || !addForm.tanggalKembaliRencana || !addForm.keperluan) return
        const result = await createPeminjaman(addForm)
        if (result) {
            setIsAddOpen(false)
            resetAddForm()
        }
    }

    const handleEditClick = (item: Peminjaman) => {
        setEditingItem(item)
        setEditForm({
            userId: item.userId,
            alatId: item.alatId,
            jumlah: item.jumlah,
            tanggalPinjam: item.tanggalPinjam.split('T')[0],
            tanggalKembaliRencana: item.tanggalKembaliRencana.split('T')[0],
            keperluan: item.keperluan,
            status: item.status
        })
    }

    const handleEditSubmit = async () => {
        if (!editingItem || !editForm.userId || !editForm.alatId || !editForm.tanggalPinjam || !editForm.tanggalKembaliRencana || !editForm.keperluan) return

        const result = await updatePeminjaman(editingItem.id, editForm)
        if (result) {
            resetEditForm()
        }
    }

    const handleApprove = async () => {
        if (!approvingItem) return
        await updatePeminjaman(approvingItem.id, { status: 'disetujui' })
        setApprovingItem(null)
    }

    const handleLend = async () => {
        if (!lendingItem) return
        await updatePeminjaman(lendingItem.id, { status: 'dipinjam' })
        setLendingItem(null)
    }

    const handleReject = async () => {
        if (!rejectingItem) return
        await updatePeminjaman(rejectingItem.id, { status: 'ditolak', catatanValidasi: rejectReason })
        setRejectingItem(null)
        setRejectReason('')
    }

    const handleDelete = async () => {
        if (!deletingItem) return
        await deletePeminjaman(deletingItem.id)
        setDeletingItem(null)
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
            const res = await fetch(`/api/peminjaman?limit=10000`)
            const result = await res.json()
            if (result.success && result.data) {
                const ids = result.data.map((item: Peminjaman) => item.id)
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
            const response = await fetch('/api/peminjaman/bulk-delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            })
            const result = await response.json()

            if (result.success) {
                setIsBulkDeleteDialogOpen(false)
                setSelectedIds([])
                setSelectAllMode(null)
                // Refetch data to update UI
                await refetch()
            }
        } catch (error) {
            console.error('Bulk delete error:', error)
        } finally {
            setBulkDeleting(false)
        }
    }

    // Print Loan Receipt
    const handlePrintLoanReceipt = async (item: Peminjaman) => {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${t('loans.loanProofTitle')} - ${item.kode}</title>
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
                            <h1>${t('loans.loanProofTitle')}</h1>
                            <p>${t('loans.loanProofSubtitle')}</p>
                        </div>
                        <div class="meta">
                            <div class="meta-item">
                                <div class="meta-label">${t('loans.loanCode')}</div>
                                <div class="meta-value">${item.kode}</div>
                            </div>
                            <div class="meta-item" style="margin-top: 12px;">
                                <div class="meta-label">${t('loans.loanDate')}</div>
                                <div class="meta-value">${formatDate(item.tanggalPinjam)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="main-info">
                        <div class="grid">
                            <div class="info-group">
                                <div class="label">${t('adminLoans.table.tool')}</div>
                                <div class="value">${item.alat?.nama}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.alat?.kode}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('adminLoans.table.borrower')}</div>
                                <div class="value">${item.user?.nama}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.user?.email}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section-title">${t('common.details')}</div>
                    
                    <div class="grid">
                        <div>
                            <div class="info-group">
                                <div class="label">${t('loans.returnDatePlan')}</div>
                                <div class="value">${formatDate(item.tanggalKembaliRencana)}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('adminLoans.detail.quantity')}</div>
                                <div class="value">${item.jumlah} Unit</div>
                            </div>
                        </div>
                        <div>
                            <div class="info-group">
                                <div class="label">${t('adminLoans.form.purpose')}</div>
                                <div class="value" style="font-style: italic;">"${item.keperluan}"</div>
                            </div>
                        </div>
                    </div>

                    <div class="status-box">
                       ${t('adminLoans.status.borrowed')}
                    </div>

                    <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
                        * ${t('loans.loanProofNote')}
                    </div>

                    <div class="signature-area">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">${t('loans.borrowerSignature')}</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">${t('loans.officerSignature')}</div>
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

        const fileName = `Bukti_Peminjaman_${item.kode}.pdf`
        const url = await downloadReceiptPDF(htmlContent, fileName, true)
        if (url && typeof url === 'string') {
            setPrintPreviewUrl(url)
            setPreviewFileName(fileName)
            setIsPrintPreviewOpen(true)
        }
    }

    // Pagination buttons
    const renderPaginationButtons = () => {
        const { page, totalPages } = { page: currentPage, totalPages: pagination.totalPages }
        const buttons = []

        buttons.push(
            <Button
                key="prev"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={page <= 1}
                onClick={() => setCurrentPage(page - 1)}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
        )

        const startPage = Math.max(1, page - 2)
        const endPage = Math.min(totalPages, page + 2)

        if (startPage > 1) {
            buttons.push(
                <Button key={1} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(1)}>1</Button>
            )
            if (startPage > 2) buttons.push(<span key="dots1" className="px-1 text-slate-400">...</span>)
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className={`h - 9 w - 9 p - 0 rounded - lg ${i === page
                        ? 'border-primary bg-primary/10 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        } `}
                    onClick={() => setCurrentPage(i)}
                >
                    {i}
                </Button>
            )
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttons.push(<span key="dots2" className="px-1 text-slate-400">...</span>)
            buttons.push(
                <Button key={totalPages} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                </Button>
            )
        }

        buttons.push(
            <Button
                key="next"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={page >= totalPages}
                onClick={() => setCurrentPage(page + 1)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        )

        return buttons
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
                                <ClipboardList className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('adminLoans.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('adminLoans.subtitle')}
                            </p>
                        </div>

                        {/* Add Peminjaman Dialog */}
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md cursor-pointer">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('adminLoans.add')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>{t('adminLoans.addTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('adminLoans.addDesc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.borrower')}</Label>
                                        <Select
                                            value={addForm.userId ? addForm.userId.toString() : ''}
                                            onValueChange={(value) => setAddForm(prev => ({ ...prev, userId: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
                                                <SelectValue placeholder={t('adminLoans.form.selectBorrower')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {userList.map(user => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>{user.nama} ({user.email})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.tool')}</Label>
                                        <Select
                                            value={addForm.alatId ? addForm.alatId.toString() : '0'}
                                            onValueChange={(value) => setAddForm(prev => ({ ...prev, alatId: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
                                                <SelectValue placeholder={t('adminLoans.form.selectTool')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0" disabled>{t('adminLoans.form.selectTool')}</SelectItem>
                                                {alatList.filter(a => a.stokTersedia > 0 && a.status !== 'maintenance' && a.status !== 'habis').map(alat => (
                                                    <SelectItem key={alat.id} value={alat.id.toString()}>
                                                        {alat.kode} - {alat.nama} ({t('loans.stock')}: {alat.stokTersedia})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('adminLoans.form.amount')}</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={addForm.jumlah}
                                                onChange={(e) => setAddForm(prev => ({ ...prev, jumlah: parseInt(e.target.value) || 1 }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('adminLoans.form.loanDate')}</Label>
                                            <Input
                                                type="date"
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={addForm.tanggalPinjam}
                                                onChange={(e) => setAddForm(prev => ({ ...prev, tanggalPinjam: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.returnDate')}</Label>
                                        <Input
                                            type="date"
                                            value={addForm.tanggalKembaliRencana}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, tanggalKembaliRencana: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.purpose')}</Label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-slate-700 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            placeholder={t('adminLoans.form.purposePlaceholder')}
                                            value={addForm.keperluan}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, keperluan: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className='cursor-pointer'>{t('common.cancel')}</Button>
                                    </DialogClose>
                                    <Button
                                        onClick={handleAddSubmit}
                                        disabled={creating || !addForm.alatId || !addForm.tanggalPinjam || !addForm.tanggalKembaliRencana || !addForm.keperluan}
                                        className="dark:bg-primary dark:text-white dark:hover:bg-primary/90 cursor-pointer"
                                    >
                                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('common.submit')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Edit Peminjaman Dialog */}
                        <Dialog open={!!editingItem} onOpenChange={(open) => !open && resetEditForm()}>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>{t('adminLoans.editTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('adminLoans.editDesc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.borrower')}</Label>
                                        <Select
                                            value={editForm.userId ? editForm.userId.toString() : ''}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, userId: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
                                                <SelectValue placeholder={t('adminLoans.form.selectBorrower')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {userList.map(user => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>{user.nama} ({user.email})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.tool')}</Label>
                                        <Select
                                            value={editForm.alatId ? editForm.alatId.toString() : '0'}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, alatId: parseInt(value) }))}
                                        >
                                            <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
                                                <SelectValue placeholder={t('adminLoans.form.selectTool')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0" disabled>{t('adminLoans.form.selectTool')}</SelectItem>
                                                {alatList.map(alat => (
                                                    <SelectItem key={alat.id} value={alat.id.toString()}>
                                                        {alat.kode} - {alat.nama} {alat.stokTersedia > 0 ? `(${t('loans.stock')}: ${alat.stokTersedia})` : '(Habis)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('adminLoans.form.amount')}</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={editForm.jumlah || 1}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, jumlah: parseInt(e.target.value) || 1 }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('adminLoans.form.loanDate')}</Label>
                                            <Input
                                                type="date"
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={editForm.tanggalPinjam || ''}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, tanggalPinjam: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.returnDate')}</Label>
                                        <Input
                                            type="date"
                                            value={editForm.tanggalKembaliRencana || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, tanggalKembaliRencana: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('adminLoans.form.purpose')}</Label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-slate-700 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            placeholder={t('adminLoans.form.purposePlaceholder')}
                                            value={editForm.keperluan || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, keperluan: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className='cursor-pointer'>{t('common.cancel')}</Button>
                                    </DialogClose>
                                    <Button
                                        onClick={handleEditSubmit}
                                        disabled={updating || !editForm.alatId || !editForm.tanggalPinjam || !editForm.tanggalKembaliRencana || !editForm.keperluan}
                                        className="dark:bg-primary dark:text-white dark:hover:bg-primary/90 cursor-pointer"
                                    >
                                        {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('common.saveChanges')}
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
                                className="pl-10 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus-visible:ring-primary w-full"
                                placeholder={t('adminLoans.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>
                        {/* Filters */}
                        <div className="w-full md:w-[200px]">
                            <Select
                                value={statusFilter || undefined}
                                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('common.allStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                                    <SelectItem value="menunggu">{t('adminLoans.status.waiting')}</SelectItem>
                                    <SelectItem value="disetujui">{t('adminLoans.status.approved')}</SelectItem>
                                    <SelectItem value="dipinjam">{t('adminLoans.status.borrowed')}</SelectItem>
                                    <SelectItem value="dikembalikan">{t('adminLoans.status.returned')}</SelectItem>
                                    <SelectItem value="ditolak">{t('adminLoans.status.rejected')}</SelectItem>
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
                                        <><strong>{selectedIds.length}</strong> {t('adminLoans.selection.from')} <strong>{pagination.total}</strong> {t('adminLoans.selection.total')}</>
                                    ) : (
                                        <><strong>{selectedIds.length}</strong> {t('adminLoans.selection.selected')} {t('adminLoans.selection.onPage')}</>
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
                                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {t('adminLoans.selection.loading')}</>
                                        ) : (
                                            <>{t('adminLoans.selection.selectAll', { total: pagination.total })}</>
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
                                    {t('adminLoans.selection.cancel')}
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
                                <p className="text-lg font-medium">{t('loans.noLoanData')}</p>
                                <p className="text-sm">{t('loans.noLoanDataDesc')}</p>
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
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminLoans.table.code')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminLoans.table.borrower')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminLoans.table.tool')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminLoans.table.loanDate')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminLoans.table.returnDate')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('adminLoans.table.status')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('adminLoans.table.action')}</th>
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
                                                <span className="font-mono text-sm font-semibold text-primary dark:text-blue-200">{item.kode}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border border-slate-200 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                                                        {item.user?.nama?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.user?.nama}</div>
                                                        <div className="text-xs text-slate-500">{item.user?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{item.alat?.nama}</div>
                                                    <div className="text-xs text-slate-500">Qty: {item.jumlah}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                {formatDate(item.tanggalPinjam)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                {formatDate(item.tanggalKembaliRencana)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(item.status, item.tanggalKembaliRencana)}
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

                                                    {item.status === 'menunggu' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                                onClick={() => setApprovingItem(item)}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => setRejectingItem(item)}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {item.status === 'disetujui' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                                                            onClick={() => setLendingItem(item)}
                                                            title={t('adminLoans.lend')}
                                                        >
                                                            <HandCoins className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {item.status === 'dipinjam' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50"
                                                            onClick={() => handlePrintLoanReceipt(item)}
                                                            title={t('common.print')}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => handleEditClick(item)}
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

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between rounded-b-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {t('common.showing')} <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {data.length > 0 ? ((currentPage - 1) * pagination.limit) + 1 : 0}-{Math.min(currentPage * pagination.limit, pagination.total)}
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
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{t('adminLoans.detailTitle')}</DialogTitle>
                    </DialogHeader>
                    {viewingItem && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-2xl font-bold font-mono text-primary dark:text-blue-200">{viewingItem.kode}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('adminLoans.detail.borrowedDate')}: {formatDate(viewingItem.createdAt)}</p>
                                </div>
                                {getStatusBadge(viewingItem.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t('adminLoans.table.borrower')}</p>
                                    <p className="font-medium">{viewingItem.user?.nama}</p>
                                    <p className="text-sm text-slate-500">{viewingItem.user?.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t('adminLoans.table.tool')}</p>
                                    <p className="font-medium">{viewingItem.alat?.nama}</p>
                                    <p className="text-sm text-slate-500">{t('adminLoans.detail.quantity')}: {viewingItem.jumlah}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t('adminLoans.table.loanDate')}</p>
                                    <p className="font-medium">{formatDate(viewingItem.tanggalPinjam)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t('adminLoans.table.returnDate')}</p>
                                    <p className="font-medium">{formatDate(viewingItem.tanggalKembaliRencana)}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">{t('adminLoans.form.purpose')}</p>
                                <p className="text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">{viewingItem.keperluan}</p>
                            </div>
                            {viewingItem.validator && (
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">{t('adminLoans.detail.validatedBy')}</p>
                                    <p className="text-sm">{viewingItem.validator.nama} - {viewingItem.validatedAt && formatDate(viewingItem.validatedAt)}</p>
                                </div>
                            )}
                            {viewingItem.catatanValidasi && (
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">{t('adminLoans.detail.validationNote')}</p>
                                    <p className="text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-700 dark:text-red-300">{viewingItem.catatanValidasi}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={!!approvingItem} onOpenChange={(open) => !open && setApprovingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            {t('adminLoans.approveTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('adminLoans.approveDesc', { code: approvingItem?.kode || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApprovingItem(null)}>{t('common.cancel')}</Button>
                        <Button onClick={handleApprove} disabled={updating} className="bg-green-600 hover:bg-green-700">
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('adminLoans.confirmApprove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={!!rejectingItem} onOpenChange={(open) => !open && setRejectingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <XCircle className="h-5 w-5" />
                            {t('adminLoans.rejectTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('adminLoans.rejectDesc', { code: rejectingItem?.kode || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>{t('adminLoans.rejectReason')}</Label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-slate-700 px-3 py-2 text-sm mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Jelaskan alasan penolakan..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectingItem(null)}>{t('common.cancel')}</Button>
                        <Button onClick={handleReject} disabled={updating} variant="destructive">
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('adminLoans.reject')}
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
                            {t('adminLoans.deleteTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('adminLoans.deleteDesc', { code: deletingItem?.kode || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingItem(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button onClick={handleDelete} disabled={deleting} variant="destructive" className='cursor-pointer'>
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('adminLoans.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lend Dialog */}
            <Dialog open={!!lendingItem} onOpenChange={(open) => !open && setLendingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-purple-600 flex items-center gap-2">
                            <HandCoins className="h-5 w-5" />
                            {t('adminLoans.lendTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('adminLoans.lendDesc', { code: lendingItem?.kode || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLendingItem(null)}>{t('common.cancel')}</Button>
                        <Button onClick={handleLend} disabled={updating} className="bg-purple-600 hover:bg-purple-700">
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('adminLoans.confirmLend')}
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
                            <span className="dark:text-slate-100">Export Data Peminjaman</span>
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
                                            {selectedColumns.includes(col.key) && <CheckCircle className="w-3.5 h-3.5" />}
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
                            Apakah Anda yakin ingin menghapus {selectedIds.length} data peminjaman yang dipilih? Tindakan ini tidak dapat dibatalkan.
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
                        <DialogTitle>{t('common.printPreview')}</DialogTitle>
                        <DialogDescription>{t('common.printPreviewDesc')}</DialogDescription>
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
