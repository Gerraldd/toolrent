'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Search,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Info,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar,
    Filter,
    Download
} from 'lucide-react'
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
import { format, differenceInDays } from 'date-fns'
import { id as indonesianLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { useMyReturns, useMyActiveLoans } from '@/hooks/use-peminjam'
import { useLanguage } from '@/contexts/language-context'

interface Pengembalian {
    id: number
    peminjaman: { id: number; kode: string; tanggalPinjam: string; tanggalKembaliRencana: string; jumlah?: number }
    user: { nama: string; email: string }
    alat: { nama: string; kode: string }
    tanggalKembali: string
    kondisi: string
    jumlahBaik?: number
    jumlahRusak?: number
    jumlahHilang?: number
    denda: number
    hariTerlambat: number
    keterangan: string
    status: string
}

interface ActiveLoan {
    id: number
    kode: string
    alat: { id: number; kode: string; nama: string; gambar?: string }
    tanggalPinjam: string
    tanggalKembaliRencana: string
    jumlah: number
    keperluan: string
    status: string
}

export default function PengembalianAlatPage() {
    const { t, language } = useLanguage()
    const [searchValue, setSearchValue] = useState('')
    const [kondisiFilter, setKondisiFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [selectedDetail, setSelectedDetail] = useState<Pengembalian | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Return form states
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
    const [selectedLoanId, setSelectedLoanId] = useState('')
    const [returnForm, setReturnForm] = useState({
        jumlahBaik: 0,
        jumlahRusak: 0,
        jumlahHilang: 0,
        keterangan: ''
    })
    const [submitting, setSubmitting] = useState(false)

    // API Hooks
    const { data: pengembalianData, pagination, loading, error, fetchMyReturns } = useMyReturns()
    const { data: activeLoansData, loading: loadingActiveLoans, fetchActiveLoans } = useMyActiveLoans()

    // Fetch data on mount
    useEffect(() => {
        fetchMyReturns({ page: currentPage, limit: itemsPerPage, search: searchValue, kondisi: kondisiFilter, status: statusFilter })
    }, [fetchMyReturns, currentPage, searchValue, kondisiFilter, statusFilter])

    useEffect(() => {
        if (isReturnDialogOpen) fetchActiveLoans()
    }, [isReturnDialogOpen, fetchActiveLoans])

    const totalPages = pagination?.totalPages || 1

    // Get selected loan details
    const selectedLoan = (activeLoansData as ActiveLoan[]).find(loan => loan.id.toString() === selectedLoanId)

    // Calculate late days for selected loan
    const lateDays = selectedLoan
        ? Math.max(0, differenceInDays(new Date(), new Date(selectedLoan.tanggalKembaliRencana)))
        : 0
    const estimatedFine = lateDays * 5000

    // Handle return submission
    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedLoan) return

        setSubmitting(true)
        try {
            const res = await fetch('/api/pengembalian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    peminjamanId: selectedLoan.id,
                    jumlahBaik: returnForm.jumlahBaik,
                    jumlahRusak: returnForm.jumlahRusak,
                    jumlahHilang: returnForm.jumlahHilang,
                    keterangan: returnForm.keterangan
                })
            })
            const result = await res.json()

            if (result.success) {
                toast.success(t('language') === 'id' ? 'Pengembalian berhasil diproses!' : 'Return processed successfully!')
                setIsReturnDialogOpen(false)
                setSelectedLoanId('')
                setReturnForm({ jumlahBaik: 0, jumlahRusak: 0, jumlahHilang: 0, keterangan: '' })
                fetchMyReturns({ page: 1, limit: itemsPerPage })
                setCurrentPage(1)
            } else {
                toast.error(result.error || (t('language') === 'id' ? 'Gagal memproses pengembalian' : 'Failed to process return'))
            }
        } catch (err) {
            toast.error(t('language') === 'id' ? 'Terjadi kesalahan jaringan' : 'Network error occurred')
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadge = (status: string, hariTerlambat: number) => {
        if (hariTerlambat > 0) {
            return (
                <span className="px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-3 h-3" />{t('returns.status.late')}
                </span>
            )
        }
        return (
            <span className="px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />{t('returns.status.onTime')}
            </span>
        )
    }

    const getKondisiBadge = (kondisi: string) => {
        const config: Record<string, string> = {
            baik: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
            rusak: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
            hilang: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        }
        const labelMap: Record<string, string> = {
            baik: t('returns.condition.good'),
            rusak: t('returns.condition.damaged'),
            hilang: t('returns.condition.lost'),
        }
        return (
            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded border border-current/20 uppercase tracking-wide ${config[kondisi] || config.baik}`}>
                {labelMap[kondisi] || kondisi}
            </span>
        )
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
                <Button key={i} variant="outline" size="sm" className={`h-9 w-9 p-0 rounded-lg ${i === page ? 'border-primary bg-primary/5 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`} onClick={() => setCurrentPage(i)}>{i}</Button>
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
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-3">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => fetchMyReturns({ page: 1, limit: itemsPerPage })}>{t('common.tryAgain')}</Button>
            </div>
        )
    }

    const formatDate = (dateStr: string) => {
        return format(new Date(dateStr), 'dd MMM yyyy', { locale: language === 'id' ? indonesianLocale : undefined })
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">

                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1">
                    {/* Header Section */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <RotateCcw className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('nav.returns')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('returns.peminjamSubtitle')}
                            </p>
                        </div>

                        <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md">
                                    <RotateCcw className="mr-2 h-5 w-5" />
                                    {t('returns.returnTool')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>{t('returns.returnFormTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('returns.returnFormDesc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleReturnSubmit}>
                                    <div className="space-y-6 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="loan-select">{t('returns.selectActiveLoanLabel')}</Label>
                                            {loadingActiveLoans ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                </div>
                                            ) : (activeLoansData as ActiveLoan[]).length === 0 ? (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700">
                                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                                    <p className="font-medium">{t('returns.noActiveLoans')}</p>
                                                    <p className="text-sm">{t('returns.allReturned')}</p>
                                                </div>
                                            ) : (
                                                <Select
                                                    value={selectedLoanId}
                                                    onValueChange={(value) => setSelectedLoanId(value)}
                                                >
                                                    <SelectTrigger className="h-11 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                                                        <SelectValue placeholder={t('returns.selectBorrowedTool')} />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[300px]">
                                                        {(activeLoansData as ActiveLoan[]).map((loan) => (
                                                            <SelectItem key={loan.id} value={loan.id.toString()} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">
                                                                {loan.alat.kode} - {loan.alat.nama} ({t('loans.status.borrowed')}: {format(new Date(loan.tanggalPinjam), 'dd MMM yyyy')})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        {selectedLoan && (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                                                <div className="flex gap-4">
                                                    <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden flex-shrink-0">
                                                        <img src={selectedLoan.alat.gambar || 'https://placehold.co/100x100/e2e8f0/64748b?text=No+Image'} alt="alat" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">{selectedLoan.alat.nama}</h4>
                                                        <p className="text-xs text-slate-500 mb-1">{selectedLoan.alat.kode}</p>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3 text-primary" /> {t('returns.loanPrefix')}: {format(new Date(selectedLoan.tanggalPinjam), 'dd MMM yyyy')}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <RotateCcw className="w-3 h-3 text-amber-500" /> {t('returns.planPrefix')}: {format(new Date(selectedLoan.tanggalKembaliRencana), 'dd MMM yyyy')}
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
                                                    value={format(new Date(), 'dd MMMM yyyy', { locale: language === 'id' ? indonesianLocale : undefined })}
                                                    readOnly
                                                    className="bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed font-medium text-slate-600 border-slate-200 dark:border-slate-600"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label>{t('returns.form.conditionLabel')}</Label>
                                                    {selectedLoan && (
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${returnForm.jumlahBaik + returnForm.jumlahRusak + returnForm.jumlahHilang === selectedLoan.jumlah
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                            }`}>
                                                            {returnForm.jumlahBaik + returnForm.jumlahRusak + returnForm.jumlahHilang} / {selectedLoan.jumlah} unit
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
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline" disabled={submitting}>{t('common.cancel')}</Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={
                                                !selectedLoan ||
                                                submitting ||
                                                (selectedLoan && returnForm.jumlahBaik + returnForm.jumlahRusak + returnForm.jumlahHilang !== selectedLoan.jumlah)
                                            }
                                            className="dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                                        >
                                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t('returns.processReturnBtn')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-6 lg:col-span-6 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus-visible:ring-primary"
                                placeholder={t('loans.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1) }}
                            />
                        </div>
                        <div className="md:col-span-3 lg:col-span-3">
                            <Select
                                value={kondisiFilter || 'all'}
                                onValueChange={(value) => { setKondisiFilter(value === 'all' ? '' : value); setCurrentPage(1) }}
                            >
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
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
                                onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setCurrentPage(1) }}
                            >
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
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

                    {/* Table Container */}
                    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 relative min-h-[460px]">
                        {loading ? (
                            <div className="flex items-center justify-center min-h-[460px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (pengembalianData as Pengembalian[]).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[460px] text-slate-500">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-full mb-3">
                                    <RotateCcw className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-lg font-medium">{t('returns.noHistory')}</p>
                                <p className="text-sm">{t('returns.noHistoryDesc')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.loanNo')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.table.user')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('nav.tools')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('loans.quantity')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.returnDate')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('returns.fine')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('common.status')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {(pengembalianData as Pengembalian[]).map((item, index) => (
                                        <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-mono text-sm font-semibold text-primary dark:text-blue-200">{item.peminjaman.kode}</span>
                                                    <span className="text-[10px] text-slate-500 italic">
                                                        {t('returns.loanPrefix')}: {formatDate(item.peminjaman.tanggalPinjam)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        {item.user.nama.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{item.user.nama}</div>
                                                        <div className="text-[11px] text-slate-500 mt-1 leading-none">{item.user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{item.alat.nama}</div>
                                                    <div className="text-[11px] text-slate-500">{item.alat.kode}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                    {item.peminjaman.jumlah || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium">{formatDate(item.tanggalKembali)}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {t('returns.planPrefix')}: {formatDate(item.peminjaman.tanggalKembaliRencana)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.denda > 0 ? (
                                                    <span className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20">
                                                        Rp {item.denda.toLocaleString('id-ID')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="space-y-1">
                                                    <div>{getStatusBadge(item.status, item.hariTerlambat)}</div>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                    onClick={() => setSelectedDetail(item)}
                                                >
                                                    <Info className="h-4 w-4" />
                                                </Button>
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
                            {t('common.showing')} <span className="font-semibold text-slate-800 dark:text-slate-200">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination?.total || pengembalianData.length)}</span> {t('common.of')} <span className="font-semibold text-slate-800 dark:text-slate-200">{pagination?.total || pengembalianData.length}</span> {t('common.data')}
                        </div>
                        <div className="flex items-center space-x-2">{renderPaginationButtons()}</div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('returns.detailTitle')}</DialogTitle>
                        <DialogDescription>{t('returns.detailDesc')}</DialogDescription>
                    </DialogHeader>
                    {selectedDetail && (
                        <div className="space-y-4 py-2">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-inner">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('returns.loanCode')}</p>
                                    <p className="font-mono text-lg font-bold text-primary dark:text-blue-200">{selectedDetail.peminjaman.kode}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    {getStatusBadge(selectedDetail.status, selectedDetail.hariTerlambat)}
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {selectedDetail.jumlahBaik !== undefined && selectedDetail.jumlahBaik !== null && selectedDetail.jumlahBaik > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                {selectedDetail.jumlahBaik} {t('returns.condition.good')}
                                            </span>
                                        )}
                                        {selectedDetail.jumlahRusak !== undefined && selectedDetail.jumlahRusak !== null && selectedDetail.jumlahRusak > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                {selectedDetail.jumlahRusak} {t('returns.condition.damaged')}
                                            </span>
                                        )}
                                        {selectedDetail.jumlahHilang !== undefined && selectedDetail.jumlahHilang !== null && selectedDetail.jumlahHilang > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                {selectedDetail.jumlahHilang} {t('returns.condition.lost')}
                                            </span>
                                        )}
                                        {(selectedDetail.jumlahBaik === undefined || selectedDetail.jumlahBaik === null) &&
                                            (selectedDetail.jumlahRusak === undefined || selectedDetail.jumlahRusak === null) &&
                                            (selectedDetail.jumlahHilang === undefined || selectedDetail.jumlahHilang === null) && (
                                                getKondisiBadge(selectedDetail.kondisi)
                                            )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('nav.tools')}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{selectedDetail.alat.nama}</p>
                                        <p className="text-[11px] text-slate-500 font-mono">{selectedDetail.alat.kode}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('returns.fine')}</p>
                                        <p className={`text-sm font-bold ${selectedDetail.denda > 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {selectedDetail.denda > 0 ? `Rp ${selectedDetail.denda.toLocaleString('id-ID')}` : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('returns.returnDate')}</p>
                                        <p className="text-sm font-bold">{formatDate(selectedDetail.tanggalKembali)}</p>
                                        <p className="text-[10px] text-slate-500 italic">
                                            {t('returns.originalPlan')}: {formatDate(selectedDetail.peminjaman.tanggalKembaliRencana)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('returns.loanDuration')}</p>
                                        <p className="text-sm font-medium">
                                            {differenceInDays(new Date(selectedDetail.tanggalKembali), new Date(selectedDetail.peminjaman.tanggalPinjam))} {t('returns.days')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {selectedDetail.keterangan && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('dashboard.table.description')}</Label>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 italic">
                                        "{selectedDetail.keterangan}"
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setSelectedDetail(null)} variant="outline" className="w-full sm:w-auto border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">{t('returns.closeButton')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
