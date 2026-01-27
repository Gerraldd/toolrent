'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import {
    Plus,
    Search,
    Filter,
    Download,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle,
    Calendar,
    Backpack,
    ClipboardList,
    Printer,
    RotateCcw,
    CheckCircle2
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { useMyLoans, useAlatList, useCreateLoan } from '@/hooks/use-peminjam'
import { useLanguage } from '@/contexts/language-context'
import { downloadReceiptPDF } from '@/lib/receipt-downloader'
import { toast } from 'sonner'

interface Peminjaman {
    id: number
    kode: string
    userId: number
    alatId: number
    jumlah: number
    tanggalPinjam: string
    tanggalKembaliRencana: string
    keperluan: string
    status: string
    catatanValidasi?: string
    createdAt: string
    user?: { id: number; nama: string; email: string }
    alat?: { id: number; kode: string; nama: string; gambar?: string }
}

interface Alat {
    id: number
    kode: string
    nama: string
    stokTersedia: number
}

export default function PeminjamanSayaPage() {
    const { t, language } = useLanguage()
    const [searchValue, setSearchValue] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [viewingItem, setViewingItem] = useState<Peminjaman | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Print Preview State
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null)
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
    const [previewFileName, setPreviewFileName] = useState('')

    // API Hooks
    const { data: peminjamanData, pagination, loading, error, fetchMyLoans } = useMyLoans()
    const { data: alatList, fetchAlat } = useAlatList()
    const { createLoan, loading: submitting } = useCreateLoan()

    const [form, setForm] = useState({
        alatId: '',
        tanggalPinjam: format(new Date(), 'yyyy-MM-dd'),
        tanggalKembali: '',
        jumlah: 1,
        keperluan: ''
    })

    // Return form states
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
    const [returningItem, setReturningItem] = useState<Peminjaman | null>(null)
    const [returnForm, setReturnForm] = useState({
        jumlahBaik: 0,
        jumlahRusak: 0,
        jumlahHilang: 0,
        keterangan: ''
    })
    const [returningSubmitting, setReturningSubmitting] = useState(false)

    // Fetch data on mount
    useEffect(() => {
        fetchMyLoans({ page: currentPage, limit: itemsPerPage, search: searchValue, status: statusFilter })
    }, [fetchMyLoans, currentPage, searchValue, statusFilter])

    useEffect(() => {
        if (isAddDialogOpen) fetchAlat({ limit: 100, status: 'tersedia' })
    }, [isAddDialogOpen, fetchAlat])

    const totalPages = pagination?.totalPages || 1

    // Format date helper
    const formatDate = (dateStr: string) => {
        return format(new Date(dateStr), 'dd MMM yyyy', { locale: language === 'id' ? id : undefined })
    }

    // Status badge styles
    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            menunggu: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: t('loans.status.pending') },
            disetujui: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: t('loans.status.approved') },
            dipinjam: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: t('loans.status.borrowed') },
            ditolak: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: t('loans.status.rejected') },
            dikembalikan: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: t('loans.status.returned') },
            terlambat: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: t('loans.status.overdue') },
        }
        const normalizedStatus = status.toLowerCase()
        const style = config[normalizedStatus] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
        return (
            <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ${style.bg} ${style.text} border border-current/20 shadow-sm`}>
                {style.label}
            </span>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const result = await createLoan({
            alatId: parseInt(form.alatId),
            tanggalPinjam: form.tanggalPinjam,
            tanggalKembaliRencana: form.tanggalKembali,
            jumlah: form.jumlah,
            keperluan: form.keperluan
        })
        if (result.success) {
            setIsAddDialogOpen(false)
            setForm({ alatId: '', tanggalPinjam: format(new Date(), 'yyyy-MM-dd'), tanggalKembali: '', jumlah: 1, keperluan: '' })
            fetchMyLoans({ page: 1, limit: itemsPerPage })
            setCurrentPage(1)
        }
    }

    // Handle return tool submission
    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!returningItem) return

        setReturningSubmitting(true)
        try {
            const res = await fetch('/api/pengembalian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    peminjamanId: returningItem.id,
                    jumlahBaik: returnForm.jumlahBaik,
                    jumlahRusak: returnForm.jumlahRusak,
                    jumlahHilang: returnForm.jumlahHilang,
                    keterangan: returnForm.keterangan
                })
            })
            const result = await res.json()

            if (result.success) {
                toast.success(t('returns.returnSuccess'))
                setIsReturnDialogOpen(false)
                setReturningItem(null)
                setReturnForm({ jumlahBaik: 0, jumlahRusak: 0, jumlahHilang: 0, keterangan: '' })
                fetchMyLoans({ page: currentPage, limit: itemsPerPage })
            } else {
                toast.error(result.error || t('returns.returnFailed'))
            }
        } catch (err) {
            toast.error(t('returns.returnFailed'))
            console.error(err)
        } finally {
            setReturningSubmitting(false)
        }
    }

    // Calculate late days for returning item
    const lateDays = returningItem
        ? Math.max(0, differenceInDays(new Date(), new Date(returningItem.tanggalKembaliRencana)))
        : 0
    const estimatedFine = lateDays * 5000

    // Print proof handler for approved loans
    const handlePrintProof = async (item: Peminjaman) => {
        // Direct download

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${t('loans.proofTitle')} - ${item.kode}</title>
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
                        /* border: 1px solid #e5e7eb; */
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
                            <h1>${t('loans.proofTitle')}</h1>
                            <p>${t('loans.proofSubtitle')}</p>
                        </div>
                        <div class="meta">
                            <div class="meta-item">
                                <div class="meta-label">${t('loans.loanCode')}</div>
                                <div class="meta-value">${item.kode}</div>
                            </div>
                            <div class="meta-item" style="margin-top: 12px;">
                                <div class="meta-label">${t('loans.requestDate')}</div>
                                <div class="meta-value">${formatDate(item.createdAt || item.tanggalPinjam)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="main-info">
                        <div class="grid">
                            <div class="info-group">
                                <div class="label">${t('nav.tools')}</div>
                                <div class="value">${item.alat?.nama || '-'}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.alat?.kode}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('loans.proofBorrower')}</div>
                                <div class="value">${item.user?.nama || '-'}</div>
                                <div style="font-size: 13px; color: #666; margin-top: 2px;">${item.user?.email}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section-title">${t('common.details')}</div>
                    
                    <div class="grid">
                        <div>
                            <div class="info-group">
                                <div class="label">${t('loans.loanDate')}</div>
                                <div class="value">${formatDate(item.tanggalPinjam)}</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('loans.returnDatePlan')}</div>
                                <div class="value">${formatDate(item.tanggalKembaliRencana)}</div>
                            </div>
                        </div>
                        <div>
                            <div class="info-group">
                                <div class="label">${t('loans.quantity')}</div>
                                <div class="value">${item.jumlah} Unit</div>
                            </div>
                            <div class="info-group">
                                <div class="label">${t('loans.purpose')}</div>
                                <div class="value" style="font-style: italic;">"${item.keperluan}"</div>
                            </div>
                        </div>
                    </div>

                    <div class="status-box">
                       ${t('loans.status.approved')}
                    </div>

                    <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
                        * ${t('loans.proofNote')}
                    </div>

                    <div class="footer">
                        <div>Generated by Sistem Peminjaman Alat</div>
                        <div>${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: language === 'id' ? id : undefined })}</div>
                    </div>
                </div>
            </body>
            </html>
        `

        const fileName = `Bukti_Pengajuan_${item.kode}.pdf`
        const url = await downloadReceiptPDF(htmlContent, fileName, true)
        if (url && typeof url === 'string') {
            setPrintPreviewUrl(url)
            setPreviewFileName(fileName)
            setIsPrintPreviewOpen(true)
        }
    }

    // Pagination buttons
    const renderPaginationButtons = () => {
        const page = currentPage
        const buttons = []
        buttons.push(
            <Button key="prev" variant="outline" size="icon" className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
        )
        const startPage = Math.max(1, page - 2)
        const endPage = Math.min(totalPages, page + 2)

        if (startPage > 1) {
            buttons.push(<Button key={1} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(1)}>1</Button>)
            if (startPage > 2) buttons.push(<span key="dots1" className="px-1 text-slate-400">...</span>)
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <Button key={i} variant="outline" size="sm" className={`h - 9 w - 9 p - 0 rounded - lg ${i === page ? 'border-primary bg-primary/5 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'} `} onClick={() => setCurrentPage(i)}>{i}</Button>
            )
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttons.push(<span key="dots2" className="px-1 text-slate-400">...</span>)
            buttons.push(<Button key={totalPages} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button>)
        }

        buttons.push(
            <Button key="next" variant="outline" size="icon" className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        )
        return buttons
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-3 text-slate-900 dark:text-white">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => fetchMyLoans({ page: 1, limit: itemsPerPage })}>{t('common.tryAgain')}</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1">
                    {/* Header Section */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-900 dark:text-white">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <ClipboardList className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('nav.myLoans')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('loans.subtitle')}
                            </p>
                        </div>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('loans.applyLoan')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] dark:bg-slate-950">
                                <DialogHeader>
                                    <DialogTitle>{t('loans.applyNewLoan')}</DialogTitle>
                                    <DialogDescription>
                                        {t('loans.applyLoanDesc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit}>
                                    <div className="grid gap-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="alat">{t('loans.selectTool')}</Label>
                                            <Select
                                                value={form.alatId}
                                                onValueChange={(value) => setForm({ ...form, alatId: value })}
                                            >
                                                <SelectTrigger className="h-11 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                                                    <SelectValue placeholder={t('loans.chooseTool')} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[300px]">
                                                    {(alatList as Alat[]).map((alat) => (
                                                        <SelectItem key={alat.id} value={alat.id.toString()} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">
                                                            {alat.kode} - {alat.nama} ({t('loans.stock')}: {alat.stokTersedia})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="tgl-pinjam">{t('loans.loanDate')}</Label>
                                                <Input id="tgl-pinjam" type="date" required value={form.tanggalPinjam} onChange={(e) => setForm({ ...form, tanggalPinjam: e.target.value })} className="dark:bg-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tgl-kembali">{t('loans.returnDatePlan')}</Label>
                                                <Input id="tgl-kembali" type="date" required value={form.tanggalKembali} onChange={(e) => setForm({ ...form, tanggalKembali: e.target.value })} className="dark:bg-slate-900" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="jumlah">{t('loans.quantity')}</Label>
                                            <Input id="jumlah" type="number" min="1" required value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: parseInt(e.target.value) || 1 })} className="dark:bg-slate-900" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="keperluan">{t('loans.purpose')}</Label>
                                            <Input id="keperluan" placeholder={t('loans.purposePlaceholder')} required value={form.keperluan} onChange={(e) => setForm({ ...form, keperluan: e.target.value })} className="dark:bg-slate-900" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="outline">{t('common.cancel')}</Button></DialogClose>
                                        <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none dark:bg-primary dark:text-white dark:hover:bg-primary/90 transition-all">
                                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t('common.submit')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Filter Toolbar Section */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 lg:col-span-8 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus-visible:ring-primary dark:text-white"
                                placeholder={t('loans.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1) }}
                            />
                        </div>
                        <div className="md:col-span-4 lg:col-span-4">
                            <Select
                                value={statusFilter || 'all'}
                                onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setCurrentPage(1) }}
                            >
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                                    <SelectValue placeholder={t('common.allStatus')} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="all" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('common.allStatus')}</SelectItem>
                                    <SelectItem value="menunggu" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('loans.status.pending')}</SelectItem>
                                    <SelectItem value="disetujui" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('loans.status.approved')}</SelectItem>
                                    <SelectItem value="dipinjam" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('loans.status.borrowed')}</SelectItem>
                                    <SelectItem value="dikembalikan" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('loans.status.returned')}</SelectItem>
                                    <SelectItem value="ditolak" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('loans.status.rejected')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 relative min-h-[460px]">
                        {loading ? (
                            <div className="flex items-center justify-center min-h-[460px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (peminjamanData as Peminjaman[]).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[460px] text-slate-500">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-full mb-3">
                                    <Backpack className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-lg font-medium">{t('loans.noLoanData')}</p>
                                <p className="text-sm">{t('loans.noLoanDataDesc')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                    <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">{t('loans.code')}</th>
                                        <th className="px-6 py-4">{t('nav.tools')}</th>
                                        <th className="px-6 py-4">{t('loans.loanDate')}</th>
                                        <th className="px-6 py-4">{t('loans.returnDatePlan')}</th>
                                        <th className="px-6 py-4 text-center">{t('common.status')}</th>
                                        <th className="px-6 py-4 text-center">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {(peminjamanData as Peminjaman[]).map((item, index) => (
                                        <tr key={item.id} className={`hover: bg - slate - 50 dark: hover: bg - slate - 700 / 50 transition - colors group ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''} `}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm font-semibold text-primary dark:text-blue-200">{item.kode}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.alat?.nama}</div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">{t('loans.quantity')}: {item.jumlah}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                {formatDate(item.tanggalPinjam)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                {formatDate(item.tanggalKembaliRencana)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                        onClick={() => setViewingItem(item)}
                                                        title={t('common.view')}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {item.status.toLowerCase() === 'disetujui' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                            onClick={() => handlePrintProof(item)}
                                                            title={t('loans.printProof')}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {item.status.toLowerCase() === 'dipinjam' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                            onClick={() => {
                                                                setReturningItem(item)
                                                                setIsReturnDialogOpen(true)
                                                            }}
                                                            title={t('returns.returnTool')}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
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

                    {/* Pagination Section */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between rounded-b-md">
                        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {t('common.showing')} <span className="font-semibold text-slate-800 dark:text-slate-200">{peminjamanData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, pagination?.total || 0)}</span> {t('common.of')} <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination?.total || 0}</span> {t('common.data')}
                        </div>
                        <div className="flex items-center space-x-2">{renderPaginationButtons()}</div>
                    </div>
                </div>
            </div>

            {/* View Detail Dialog */}
            <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
                <DialogContent className="sm:max-w-[550px] dark:bg-slate-950">
                    <DialogHeader>
                        <DialogTitle>{t('loans.detailTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('loans.detailDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingItem && (
                        <div className="space-y-4 py-2">
                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('loans.loanCode')}</p>
                                    <p className="text-2xl font-bold font-mono text-primary dark:text-blue-200">{viewingItem.kode}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 italic font-medium uppercase font-bold tracking-wider">
                                        {t('loans.requestDate')}: {formatDate(viewingItem.createdAt || viewingItem.tanggalPinjam)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {getStatusBadge(viewingItem.status)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('nav.tools')}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{viewingItem.alat?.nama}</p>
                                        <p className="text-[11px] text-slate-500">{t('loans.quantity')}: {viewingItem.jumlah}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('loans.loanDate')}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(viewingItem.tanggalPinjam)}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('loans.returnDatePlan')}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(viewingItem.tanggalKembaliRencana)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('loans.entity')}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{viewingItem.user?.nama}</p>
                                        <p className="text-[11px] text-slate-500 truncate">{viewingItem.user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('loans.purpose')}</Label>
                                <div className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 italic text-slate-600 dark:text-slate-300">
                                    "{viewingItem.keperluan}"
                                </div>
                            </div>

                            {viewingItem.catatanValidasi && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-red-400 uppercase font-bold tracking-wider">{t('loans.validationNotes')}</Label>
                                    <div className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300 font-medium">
                                        {viewingItem.catatanValidasi}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewingItem(null)} variant="outline" className="w-full sm:w-auto border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">{t('common.close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Return Tool Dialog */}
            <Dialog open={isReturnDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsReturnDialogOpen(false)
                    setReturningItem(null)
                    setReturnForm({ jumlahBaik: 0, jumlahRusak: 0, jumlahHilang: 0, keterangan: '' })
                }
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-slate-950">
                    <DialogHeader>
                        <DialogTitle>{t('returns.returnFormTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('returns.returnFormDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReturnSubmit}>
                        <div className="space-y-6 py-4">
                            {/* Selected Loan Info - Pre-filled */}
                            {returningItem && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div className="flex gap-4">
                                        <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden flex-shrink-0">
                                            <img src={returningItem.alat?.gambar || 'https://placehold.co/100x100/e2e8f0/64748b?text=No+Image'} alt="alat" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white">{returningItem.alat?.nama}</h4>
                                            <p className="text-xs text-slate-500 mb-1">{returningItem.alat?.kode}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-primary" /> {t('returns.loanPrefix')}: {formatDate(returningItem.tanggalPinjam)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <RotateCcw className="w-3 h-3 text-amber-500" /> {t('returns.planPrefix')}: {formatDate(returningItem.tanggalKembaliRencana)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {lateDays > 0 ? (
                                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-100 dark:border-red-900/30">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>
                                                {t('returns.lateDaysInfo', { days: lateDays.toString(), fine: estimatedFine.toLocaleString('id-ID') })}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span>{t('returns.onTimeReturn')}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tgl-kembali">{t('returns.returnDate')}</Label>
                                    <Input
                                        id="tgl-kembali"
                                        type="text"
                                        value={format(new Date(), 'dd MMMM yyyy', { locale: language === 'id' ? id : undefined })}
                                        readOnly
                                        className="bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed font-medium text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>{t('returns.form.conditionLabel')}</Label>
                                        {returningItem && (
                                            <span className={`text - xs font - medium px - 2 py - 0.5 rounded ${returnForm.jumlahBaik + returnForm.jumlahRusak + returnForm.jumlahHilang === returningItem.jumlah
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                } `}>
                                                {returnForm.jumlahBaik + returnForm.jumlahRusak + returnForm.jumlahHilang} / {returningItem.jumlah} unit
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-emerald-600">{t('returns.condition.good')}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={returnForm.jumlahBaik}
                                                onChange={(e) => setReturnForm(prev => ({ ...prev, jumlahBaik: parseInt(e.target.value) || 0 }))}
                                                className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-orange-600">{t('returns.condition.damaged')}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={returnForm.jumlahRusak}
                                                onChange={(e) => setReturnForm(prev => ({ ...prev, jumlahRusak: parseInt(e.target.value) || 0 }))}
                                                className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-red-600">{t('returns.condition.lost')}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={returnForm.jumlahHilang}
                                                onChange={(e) => setReturnForm(prev => ({ ...prev, jumlahHilang: parseInt(e.target.value) || 0 }))}
                                                className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 h-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="keterangan">{t('dashboard.table.description')}</Label>
                                <Input
                                    id="keterangan"
                                    placeholder={t('returns.notesPlaceholderLong')}
                                    value={returnForm.keterangan}
                                    onChange={(e) => setReturnForm({ ...returnForm, keterangan: e.target.value })}
                                    className="dark:bg-slate-800 dark:text-white dark:border-slate-600"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={returningSubmitting} className="dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">{t('common.cancel')}</Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={
                                    !returningItem ||
                                    returningSubmitting ||
                                    (returningItem && returnForm.jumlahBaik + returnForm.jumlahRusak + returnForm.jumlahHilang !== returningItem.jumlah)
                                }
                                className="dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                            >
                                {returningSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('returns.processReturnBtn')}
                            </Button>
                        </DialogFooter>
                    </form>
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
