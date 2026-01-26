'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Search,
    CheckCircle,
    CheckCircle2,
    XCircle,
    Calendar,
    AlertCircle,
    Loader2,
    HandCoins,
    Clock
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'

// Types
interface LoanRequest {
    id: number
    kode: string
    user: {
        nama: string
        email: string
        noTelepon?: string | null
    }
    alat: {
        nama: string
        kode: string
        gambar?: string | null
    }
    tanggalPinjam: string
    tanggalKembaliRencana: string
    jumlah: number
    keperluan: string
    status: string
    createdAt: string
}

export default function ValidasiPage() {
    const { t, language } = useLanguage()
    const [loans, setLoans] = useState<LoanRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [searchValue, setSearchValue] = useState('')
    const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null)
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [processing, setProcessing] = useState(false)

    // Fetch pending and approved loans
    const fetchPendingLoans = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch both menunggu and disetujui status
            const [pendingRes, approvedRes] = await Promise.all([
                fetch(`/api/peminjaman?status=menunggu&limit=100${searchValue ? `&search=${searchValue}` : ''}`),
                fetch(`/api/peminjaman?status=disetujui&limit=100${searchValue ? `&search=${searchValue}` : ''}`)
            ])

            const [pendingData, approvedData] = await Promise.all([
                pendingRes.json(),
                approvedRes.json()
            ])

            if (pendingData.success && approvedData.success) {
                // Combine both arrays, sort by createdAt desc
                const combined = [...pendingData.data, ...approvedData.data].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                setLoans(combined)
            } else {
                toast.error(t('validation.loadFailed'))
            }
        } catch (error) {
            console.error('Fetch error:', error)
            toast.error(t('validation.loadFailed'))
        } finally {
            setLoading(false)
        }
    }, [searchValue, t])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPendingLoans()
        }, 300)
        return () => clearTimeout(timer)
    }, [fetchPendingLoans])

    // Approve handler - changes status from 'menunggu' to 'disetujui'
    const handleApprove = async (id: number) => {
        setProcessing(true)
        try {
            const response = await fetch(`/api/peminjaman/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'disetujui' })
            })
            const result = await response.json()

            if (result.success) {
                toast.success(t('validation.approveSuccess'))
                // Update local state to reflect the new status
                setLoans(prev => prev.map(loan =>
                    loan.id === id ? { ...loan, status: 'disetujui' } : loan
                ))
            } else {
                toast.error(result.error || t('validation.approveFailed'))
            }
        } catch (error) {
            console.error('Approve error:', error)
            toast.error(t('validation.approveFailed'))
        } finally {
            setProcessing(false)
        }
    }

    // Lend handler - changes status from 'disetujui' to 'dipinjam'
    const handleLend = async (id: number) => {
        setProcessing(true)
        try {
            const response = await fetch(`/api/peminjaman/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'dipinjam' })
            })
            const result = await response.json()

            if (result.success) {
                toast.success(t('validation.lendSuccess'))
                // Remove from list as status is now 'dipinjam'
                setLoans(prev => prev.filter(loan => loan.id !== id))
            } else {
                toast.error(result.error || t('validation.lendFailed'))
            }
        } catch (error) {
            console.error('Lend error:', error)
            toast.error(t('validation.lendFailed'))
        } finally {
            setProcessing(false)
        }
    }

    // Reject handler
    const handleReject = async () => {
        if (!selectedLoan) return

        setProcessing(true)
        try {
            const response = await fetch(`/api/peminjaman/${selectedLoan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'ditolak',
                    catatanValidasi: rejectReason || 'Ditolak oleh petugas'
                })
            })
            const result = await response.json()

            if (result.success) {
                toast.error(t('validation.rejectSuccess'))
                setLoans(prev => prev.filter(loan => loan.id !== selectedLoan.id))
                setRejectDialogOpen(false)
                setSelectedLoan(null)
                setRejectReason('')
            } else {
                toast.error(result.error || t('validation.rejectFailed'))
            }
        } catch (error) {
            console.error('Reject error:', error)
            toast.error(t('validation.rejectFailed'))
        } finally {
            setProcessing(false)
        }
    }

    const formatDate = (date: string) => new Date(date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric'
    })

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in text-slate-900 dark:text-slate-100">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-primary dark:text-blue-200" />
                            {t('validation.title')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                            {t('validation.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-8 sticky top-0 z-20">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 h-11 bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:ring-primary text-base rounded-md"
                                placeholder={t('validation.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Grid Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : loans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('validation.allClear')}</h3>
                        <p className="text-base text-center max-w-md">
                            {t('validation.noPending')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pb-10">
                        {loans.map((loan) => (
                            <div key={loan.id} className="relative group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                                {/* Decorative Gradient Header - different color based on status */}
                                <div className={`absolute top-0 left-0 right-0 h-1 ${loan.status === 'disetujui' ? 'bg-emerald-500' : 'bg-primary'}`} />

                                <div className="p-5 flex flex-col flex-1 gap-4">
                                    {/* Header: User Info & Loan Code */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shadow-sm">
                                                {loan.user.nama.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{loan.user.nama}</h4>
                                                <p className="text-xs text-slate-500 font-medium">{loan.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-medium text-slate-500">
                                                {loan.kode}
                                            </span>
                                            {/* Status Badge */}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${loan.status === 'disetujui'
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                                }`}>
                                                {loan.status === 'disetujui' ? (
                                                    <><CheckCircle2 className="w-3 h-3" /> {t('validation.statusApproved')}</>
                                                ) : (
                                                    <><Clock className="w-3 h-3" /> {t('validation.statusWaiting')}</>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tool Information */}
                                    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
                                        <div className="h-12 w-12 rounded-lg bg-white dark:bg-slate-700 p-1 border border-slate-200 dark:border-slate-600 shadow-sm flex-shrink-0">
                                            <img
                                                src={loan.alat.gambar || 'https://placehold.co/100x100/e2e8f0/64748b?text=Tool'}
                                                alt={loan.alat.nama}
                                                className="w-full h-full object-cover rounded-md"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-center overflow-hidden">
                                            <h5 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{loan.alat.nama}</h5>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {loan.alat.kode} • Qty: {loan.jumlah}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Loan Details */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-medium">{t('validation.loanDate')}</span>
                                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                {formatDate(loan.tanggalPinjam)}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-medium">{t('validation.returnPlan')}</span>
                                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                                                {formatDate(loan.tanggalKembaliRencana)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Purpose */}
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-slate-400 mb-1.5">{t('validation.purpose')}</p>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                            "{loan.keperluan}"
                                        </div>
                                    </div>

                                    {/* Actions - Different buttons based on status */}
                                    <div className="flex gap-2 pt-2 mt-auto">
                                        {loan.status === 'menunggu' ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 h-10 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200"
                                                    onClick={() => {
                                                        setSelectedLoan(loan)
                                                        setRejectDialogOpen(true)
                                                    }}
                                                    disabled={processing}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    {t('validation.reject')}
                                                </Button>
                                                <Button
                                                    className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 dark:shadow-none transition-all duration-200"
                                                    onClick={() => handleApprove(loan.id)}
                                                    disabled={processing}
                                                >
                                                    {processing ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    {t('validation.approve')}
                                                </Button>
                                            </>
                                        ) : (
                                            /* Status is 'disetujui' - show Lend button */
                                            <Button
                                                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 dark:shadow-none transition-all duration-200"
                                                onClick={() => handleLend(loan.id)}
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <HandCoins className="w-4 h-4 mr-2" />
                                                )}
                                                {t('validation.lend')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Confirmation Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            {t('validation.rejectTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('validation.rejectDesc')} <strong>{selectedLoan?.kode}</strong> {t('validation.rejectFrom')} <strong>{selectedLoan?.user.nama}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('validation.rejectReason')} <span className="text-slate-500 font-normal">{t('validation.rejectReasonOptional')}</span></label>
                            <textarea
                                className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none transition-all"
                                placeholder={t('validation.rejectReasonPlaceholder')}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} disabled={processing}>{t('common.cancel')}</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('validation.confirmReject')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
