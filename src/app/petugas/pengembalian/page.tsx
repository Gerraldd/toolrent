'use client'

import { useState, useEffect } from 'react'
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
    Filter,
    Download,
    Eye,
    Loader2,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Printer,
    Banknote
} from 'lucide-react'
import { usePengembalian } from '@/hooks/use-pengembalian'
import { Pengembalian } from '@/lib/api-client'
import { useLanguage } from '@/contexts/language-context'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { downloadReceiptPDF } from '@/lib/receipt-downloader'

export default function PetugasPengembalianPage() {
    const { t, language } = useLanguage()

    // Use hooks
    const {
        data,
        loading,
        pagination,
        setPage,
        setSearch,
        setKondisiFilter,
        setStatusFilter,
    } = usePengembalian({ limit: 10 })

    // States
    const [searchQuery, setSearchQuery] = useState('')
    const [kondisiFilter, setKondisiFilterState] = useState('')
    const [statusFilter, setStatusFilterState] = useState('')
    const [viewingItem, setViewingItem] = useState<Pengembalian | null>(null)

    // Print Preview State
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null)
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
    const [previewFileName, setPreviewFileName] = useState('')

    // Additional fine state
    const [fineItem, setFineItem] = useState<Pengembalian | null>(null)
    const [additionalFine, setAdditionalFine] = useState<number>(0)
    const [savingFine, setSavingFine] = useState(false)

    // Handler for saving additional fine
    const handleSaveAdditionalFine = async () => {
        if (!fineItem || additionalFine <= 0) return

        setSavingFine(true)
        try {
            const response = await fetch(`/api/pengembalian/${fineItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dendaTambahan: additionalFine })
            })
            const result = await response.json()
            if (result.success) {
                // Refresh data
                setFineItem(null)
                setAdditionalFine(0)
                window.location.reload() // Simple refresh to get updated data
            }
        } catch (error) {
            console.error('Failed to save additional fine:', error)
        } finally {
            setSavingFine(false)
        }
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

    // Formatters
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
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
        const conditionKey = kondisi.toLowerCase()
        let label = kondisi
        let bg = 'bg-gray-100 dark:bg-slate-700/50'
        let text = 'text-gray-700 dark:text-slate-300'

        if (conditionKey.includes('baik')) {
            label = t('returns.condition.good')
            bg = 'bg-blue-100 dark:bg-blue-900/30'
            text = 'text-blue-700 dark:text-blue-300'
        } else if (conditionKey.includes('rusak berat')) {
            label = t('returns.condition.heavyDamage')
            bg = 'bg-red-100 dark:bg-red-900/30'
            text = 'text-red-700 dark:text-red-300'
        } else if (conditionKey.includes('rusak ringan')) {
            label = t('returns.condition.lightDamage')
            bg = 'bg-orange-100 dark:bg-orange-900/30'
            text = 'text-orange-700 dark:text-orange-300'
        } else if (conditionKey.includes('rusak')) {
            label = t('returns.condition.damaged')
            bg = 'bg-orange-100 dark:bg-orange-900/30'
            text = 'text-orange-700 dark:text-orange-300'
        } else if (conditionKey.includes('hilang')) {
            label = t('returns.condition.lost')
            bg = 'bg-red-100 dark:bg-red-900/30'
            text = 'text-red-700 dark:text-red-300'
        }

        return (
            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded ${bg} ${text} border border-current/20 uppercase tracking-wide`}>
                {label}
            </span>
        )
    }

    // Print return receipt handler
    // Print return receipt handler
    const handlePrintReceipt = async (item: Pengembalian) => {
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
                        margin: 20px 0;
                        padding: 12px;
                        border: 1px solid #000;
                        text-align: center;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        font-size: 14px;
                    }
                    
                    .fine-box {
                        margin: 15px 0;
                        padding: 15px;
                        background: #fef2f2;
                        border: 1px solid #dc2626;
                        color: #dc2626;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .fine-label { font-size: 12px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
                    .fine-amount { font-size: 24px; font-weight: 800; }

                    .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .signature-box { text-align: center; }
                    .signature-line { border-bottom: 1px solid #000; height: 60px; margin-bottom: 8px; }
                    .signature-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }

                    .footer { 
                        margin-top: 30px; 
                        padding-top: 15px; 
                        border-top: 1px solid #e5e7eb; 
                        display: flex; 
                        justify-content: space-between; 
                        color: #666; 
                        font-size: 11px; 
                    }
                    
                    @page {
                        size: A4;
                        margin: 15mm;
                    }

                    @media print { 
                        html, body { 
                            height: auto;
                            overflow: visible;
                        }
                        body { 
                            padding: 0; 
                        } 
                        .container {
                            width: 100%;
                            max-width: none;
                        }
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
                    className={`h - 9 w - 9 p - 0 rounded - lg ${i === currentPage
                        ? 'border-primary bg-primary/10 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        } `}
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
                    </div>

                    {/* Filter Toolbar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-6 lg:col-span-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus-visible:ring-primary text-slate-900 dark:text-white"
                                placeholder={t('validation.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3 lg:col-span-3">
                            <Select
                                value={kondisiFilter || 'all'}
                                onValueChange={(value) => setKondisiFilterState(value === 'all' ? '' : value)}
                            >
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                                    <SelectValue placeholder={t('common.allCondition')} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="all" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('common.allCondition')}</SelectItem>
                                    <SelectItem value="baik" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('returns.condition.good')}</SelectItem>
                                    <SelectItem value="rusak" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('returns.condition.damaged')}</SelectItem>
                                    <SelectItem value="hilang" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('returns.condition.lost')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-3 lg:col-span-3">
                            <Select
                                value={statusFilter || 'all'}
                                onValueChange={(value) => setStatusFilterState(value === 'all' ? '' : value)}
                            >
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                                    <SelectValue placeholder={t('common.allStatus')} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="all" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('common.allStatus')}</SelectItem>
                                    <SelectItem value="tepat_waktu" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('returns.status.onTime')}</SelectItem>
                                    <SelectItem value="terlambat" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('returns.status.late')}</SelectItem>
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
                                <p className="text-lg font-medium">{t('common.noData')}</p>
                                <p className="text-sm">{t('returns.noHistoryDesc')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.loanNo')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.borrower')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.tool')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loans.quantity')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.actualReturn')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.fine')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('common.status')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {data.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={`hover: bg - slate - 50 dark: hover: bg - slate - 700 / 50 transition - colors group ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''} `}
                                        >
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
                                                    <span className="text-xs text-slate-400">{t('returns.planPrefix')}: {formatDate(item.peminjaman.tanggalKembaliRencana)}</span>
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
                                                        {(item.jumlahBaik || 0) > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                {item.jumlahBaik} {t('returns.condition.good')}
                                                            </span>
                                                        )}
                                                        {(item.jumlahRusak || 0) > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                                {item.jumlahRusak} {t('returns.condition.damaged')}
                                                            </span>
                                                        )}
                                                        {(item.jumlahHilang || 0) > 0 && (
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                {item.jumlahHilang} {t('returns.condition.lost')}
                                                            </span>
                                                        )}
                                                        {!(item.jumlahBaik || 0) && !(item.jumlahRusak || 0) && !(item.jumlahHilang || 0) && (
                                                            getKondisiBadge(item.kondisi)
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-primary"
                                                        onClick={() => setViewingItem(item)}
                                                        title={t('common.view')}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {(item.kondisi === 'rusak' || item.kondisi === 'hilang') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                            onClick={() => {
                                                                setFineItem(item)
                                                                setAdditionalFine(0)
                                                            }}
                                                            title={t('returns.addFine')}
                                                        >
                                                            <Banknote className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                        onClick={() => handlePrintReceipt(item)}
                                                        title={t('returns.printReceipt')}
                                                    >
                                                        <Printer className="h-4 w-4" />
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
                        <DialogTitle>{t('returns.detailTitle')}</DialogTitle>
                        <DialogDescription>{t('returns.detailDesc')}</DialogDescription>
                    </DialogHeader>
                    {viewingItem && (
                        <div className="grid gap-4 py-4">
                            {/* Header with code and status */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('returns.loanNo')}</p>
                                    <p className="font-mono font-bold text-primary dark:text-blue-200">{viewingItem.peminjaman.kode}</p>
                                </div>
                                {getStatusBadge(viewingItem.hariTerlambat)}
                            </div>

                            {/* Peminjam & Alat */}
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.borrower')}</Label>
                                <div className="col-span-2 font-medium">
                                    {viewingItem.user.nama}
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">{viewingItem.user.email}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.tool')}</Label>
                                <div className="col-span-2 font-medium">
                                    {viewingItem.alat.nama}
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">{viewingItem.alat.kode}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.loanDate')}</Label>
                                <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">
                                    {formatDate(viewingItem.peminjaman.tanggalPinjam)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.plannedReturn')}</Label>
                                <div className="col-span-2 text-sm text-slate-500 dark:text-slate-400">
                                    {formatDate(viewingItem.peminjaman.tanggalKembaliRencana)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.actualReturn')}</Label>
                                <div className="col-span-2 text-sm font-medium text-slate-900 dark:text-white">
                                    {formatDate(viewingItem.tanggalKembali)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('catalog.condition')}</Label>
                                <div className="col-span-2">
                                    <div className="flex flex-wrap gap-1">
                                        {(viewingItem.jumlahBaik || 0) > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                {viewingItem.jumlahBaik} {t('returns.condition.good')}
                                            </span>
                                        )}
                                        {(viewingItem.jumlahRusak || 0) > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                {viewingItem.jumlahRusak} {t('returns.condition.damaged')}
                                            </span>
                                        )}
                                        {(viewingItem.jumlahHilang || 0) > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                {viewingItem.jumlahHilang} {t('returns.condition.lost')}
                                            </span>
                                        )}
                                        {!(viewingItem.jumlahBaik || 0) && !(viewingItem.jumlahRusak || 0) && !(viewingItem.jumlahHilang || 0) && (
                                            getKondisiBadge(viewingItem.kondisi)
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400">{t('returns.fine')}</Label>
                                <div className="col-span-2 text-sm font-bold text-slate-900 dark:text-white">
                                    {viewingItem.denda > 0 ? formatCurrency(viewingItem.denda) : '-'}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-start gap-4">
                                <Label className="text-right text-slate-500 dark:text-slate-400 mt-1">{t('returns.notes')}</Label>
                                <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-100 dark:border-slate-700">
                                    {viewingItem.keterangan || '-'}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewingItem(null)} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 border-none">{t('common.close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Additional Fine Dialog */}
            <Dialog open={!!fineItem} onOpenChange={(open) => !open && setFineItem(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-amber-500" />
                            {t('returns.addFineTitle')}
                        </DialogTitle>
                        <DialogDescription>{t('returns.addFineDesc')}</DialogDescription>
                    </DialogHeader>
                    {fineItem && (
                        <div className="grid gap-4 py-4">
                            {/* Item info */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{t('returns.loanNo')}</span>
                                    <span className="font-mono font-bold text-primary dark:text-blue-200">{fineItem.peminjaman.kode}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{t('returns.borrower')}</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{fineItem.user.nama}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{t('catalog.condition')}</span>
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {(fineItem.jumlahBaik || 0) > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                {fineItem.jumlahBaik} {t('returns.condition.good')}
                                            </span>
                                        )}
                                        {(fineItem.jumlahRusak || 0) > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                {fineItem.jumlahRusak} {t('returns.condition.damaged')}
                                            </span>
                                        )}
                                        {(fineItem.jumlahHilang || 0) > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                {fineItem.jumlahHilang} {t('returns.condition.lost')}
                                            </span>
                                        )}
                                        {!(fineItem.jumlahBaik || 0) && !(fineItem.jumlahRusak || 0) && !(fineItem.jumlahHilang || 0) && (
                                            getKondisiBadge(fineItem.kondisi)
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Current fine */}
                            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                                <span className="text-sm text-red-600 dark:text-red-300">{t('returns.currentFine')}</span>
                                <span className="font-bold text-red-600 dark:text-red-300">{formatCurrency(fineItem.denda)}</span>
                            </div>

                            {/* Additional fine input */}
                            <div className="space-y-2">
                                <Label htmlFor="additionalFine">{t('returns.additionalFineAmount')}</Label>
                                <Input
                                    id="additionalFine"
                                    type="number"
                                    min={0}
                                    step={1000}
                                    value={additionalFine}
                                    onChange={(e) => setAdditionalFine(Number(e.target.value))}
                                    placeholder="0"
                                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                                />
                            </div>

                            {/* New total */}
                            {additionalFine > 0 && (
                                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <span className="text-sm text-amber-600 dark:text-amber-300">{t('returns.newTotalFine')}</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-300">{formatCurrency(fineItem.denda + additionalFine)}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFineItem(null)} disabled={savingFine}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleSaveAdditionalFine}
                            disabled={savingFine || additionalFine <= 0}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {savingFine && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('common.save')}
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
