'use client'

import { useState, useEffect } from 'react'
import { usePeminjaman, Peminjaman } from '@/hooks/use-peminjaman'
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
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Search,
    Eye,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    HandCoins,
    Printer
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { downloadReceiptPDF } from '@/lib/receipt-downloader'

export default function PetugasPeminjamanPage() {
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
        updatePeminjaman,
        updating,
    } = usePeminjaman()
    const { t, language } = useLanguage()

    // Local states
    const [searchValue, setSearchValue] = useState(searchQuery)
    const [viewingItem, setViewingItem] = useState<Peminjaman | null>(null)
    const [approvingItem, setApprovingItem] = useState<Peminjaman | null>(null)
    const [lendingItem, setLendingItem] = useState<Peminjaman | null>(null)
    const [rejectingItem, setRejectingItem] = useState<Peminjaman | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    // Print Preview State
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null)
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
    const [previewFileName, setPreviewFileName] = useState('')

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

    // Handlers
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

    // Print loan proof handler for 'dipinjam' status
    const handlePrintLoanProof = async (item: Peminjaman) => {
        // Direct download

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${t('loans.loanProofTitle') || 'Bukti Peminjaman Alat'} - ${item.kode}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                        padding: 40px; 
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
                        body { padding: 0; } 
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="brand">
                            <h1>${t('loans.loanProofTitle') || 'Bukti Peminjaman Alat'}</h1>
                            <p>${t('loans.loanProofSubtitle') || 'Dokumen resmi bukti peminjaman alat'}</p>
                        </div>
                        <div class="meta">
                            <div class="meta-item">
                                <div class="meta-label">${t('loans.loanCode') || 'Kode Pinjam'}</div>
                                <div class="meta-value">${item.kode}</div>
                            </div>
                            <div class="meta-item" style="margin-top: 12px;">
                                <div class="meta-label">${t('loans.loanDate') || 'Tanggal Pinjam'}</div>
                                <div class="meta-value">${formatDate(item.tanggalPinjam)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="main-info">
                        <div class="grid">
                            <div class="info-group">
                                <div class="label">${t('adminLoans.table.tool') || 'Nama Alat'}</div>
                                <div class="value">${item.alat?.nama || '-'}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.alat?.kode}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('adminLoans.table.borrower') || 'Peminjam'}</div>
                                <div class="value">${item.user?.nama || '-'}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.user?.email}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section-title">${t('common.details') || 'Detail Peminjaman'}</div>
                    
                    <div class="grid">
                        <div>
                            <div class="info-group">
                                <div class="label">${t('loans.returnDatePlan') || 'Rencana Kembali'}</div>
                                <div class="value">${formatDate(item.tanggalKembaliRencana)}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('adminLoans.detail.quantity') || 'Jumlah'}</div>
                                <div class="value">${item.jumlah} Unit</div>
                            </div>
                        </div>
                        <div>
                            <div class="info-group">
                                <div class="label">${t('adminLoans.form.purpose') || 'Keperluan'}</div>
                                <div class="value" style="font-style: italic;">"${item.keperluan}"</div>
                            </div>
                        </div>
                    </div>

                    <div class="status-box">
                       ${t('adminLoans.status.borrowed') || 'DIPINJAM'}
                    </div>

                    <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
                        * ${t('loans.loanProofNote') || 'Harap kembalikan alat sesuai tanggal yang ditentukan.'}
                    </div>

                    <div class="signature-area">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">${t('loans.borrowerSignature') || 'Peminjam'}</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">${t('loans.officerSignature') || 'Petugas'}</div>
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
                    {/* Header Section - No Add Button for Petugas */}
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
                    </div>

                    {/* Filter Toolbar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Search */}
                        <div className="md:col-span-9 lg:col-span-9 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus-visible:ring-primary"
                                placeholder={t('adminLoans.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>
                        {/* Filters */}
                        <div className="md:col-span-3 lg:col-span-3">
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
                            >
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                                    <SelectValue placeholder={t('common.allStatus')} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="all" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('common.allStatus')}</SelectItem>
                                    <SelectItem value="menunggu" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('adminLoans.status.waiting')}</SelectItem>
                                    <SelectItem value="disetujui" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('adminLoans.status.approved')}</SelectItem>
                                    <SelectItem value="dipinjam" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('adminLoans.status.borrowed')}</SelectItem>
                                    <SelectItem value="dikembalikan" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('adminLoans.status.returned')}</SelectItem>
                                    <SelectItem value="ditolak" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('adminLoans.status.rejected')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
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
                                            className={`hover: bg - slate - 50 dark: hover: bg - slate - 700 / 50 transition - colors group ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''} `}
                                        >
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
                                                    {/* View Detail Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-primary"
                                                        onClick={() => setViewingItem(item)}
                                                        title={t('common.view')}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    {/* Actions for 'menunggu' status - Approve & Reject */}
                                                    {item.status === 'menunggu' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                                onClick={() => setApprovingItem(item)}
                                                                title={t('validation.approve')}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                onClick={() => setRejectingItem(item)}
                                                                title={t('validation.reject')}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}

                                                    {/* Actions for 'disetujui' status - Lend */}
                                                    {item.status === 'disetujui' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                            onClick={() => setLendingItem(item)}
                                                            title={t('validation.lend')}
                                                        >
                                                            <HandCoins className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* Actions for 'dipinjam' status - Print Loan Proof */}
                                                    {item.status === 'dipinjam' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                            onClick={() => handlePrintLoanProof(item)}
                                                            title={t('loans.printLoanProof') || 'Cetak Bukti Peminjaman'}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    )}
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

            {/* Lend Dialog */}
            <Dialog open={!!lendingItem} onOpenChange={(open) => !open && setLendingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-blue-600 flex items-center gap-2">
                            <HandCoins className="h-5 w-5" />
                            {t('validation.lend')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('validation.lendConfirm', { code: lendingItem?.kode || '' }) || `Konfirmasi pinjamkan alat untuk ${lendingItem?.kode}? Status akan berubah menjadi "Dipinjam".`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLendingItem(null)}>{t('common.cancel')}</Button>
                        <Button onClick={handleLend} disabled={updating} className="bg-blue-600 hover:bg-blue-700">
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('validation.lend')}
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
