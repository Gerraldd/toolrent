'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Search,
    Filter,
    Loader2,
    ChevronLeft,
    ChevronRight,
    XCircle,
    AlertCircle,
    CheckCircle2,
    Info,
    ClipboardList,
    Wrench
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAlatList, useCreateLoan } from '@/hooks/use-peminjam'
import { useLanguage } from '@/contexts/language-context'
import { useDebounce } from '@/hooks/use-debounce'
import CatalogCard, { Alat } from './catalog-card'

export default function KatalogPage() {
    const { t } = useLanguage()
    const [searchValue, setSearchValue] = useState('')
    const debouncedSearch = useDebounce(searchValue, 300)
    const [selectedCategory, setSelectedCategory] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    // API Hooks
    const { data: alatData, loading, error, fetchAlat } = useAlatList()
    const { createLoan, loading: submitting } = useCreateLoan()

    // Modal & Form States
    const [selectedDetail, setSelectedDetail] = useState<Alat | null>(null)
    const [selectedLoan, setSelectedLoan] = useState<Alat | null>(null)
    const [loanForm, setLoanForm] = useState({
        tanggalPinjam: new Date().toISOString().split('T')[0],
        tanggalKembali: '',
        jumlah: 1,
        keperluan: ''
    })

    // Fetch alat on mount
    useEffect(() => {
        fetchAlat({ limit: 100 })
    }, [fetchAlat])

    // Memoized Filter Logic
    const filteredAlat = useMemo(() => {
        if (!alatData) return []
        return (alatData as Alat[]).filter((item: Alat) => {
            const matchesSearch = item.nama.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                item.kode.toLowerCase().includes(debouncedSearch.toLowerCase())
            const matchesCategory = selectedCategory ? item.kategori?.nama === selectedCategory : true
            return matchesSearch && matchesCategory
        })
    }, [alatData, debouncedSearch, selectedCategory])

    // Pagination Logic
    const totalPages = Math.ceil(filteredAlat.length / itemsPerPage)
    const paginatedAlat = useMemo(() => {
        return filteredAlat.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        )
    }, [filteredAlat, currentPage, itemsPerPage])

    // Memoized Categories
    const categories = useMemo(() => {
        if (!alatData) return []
        return Array.from(new Set((alatData as Alat[]).map((item: Alat) => item.kategori?.nama).filter(Boolean)))
    }, [alatData])

    // Helper for Modal Badges (kept here for modal usage)
    const getStatusBadge = (item: Alat) => {
        if (item.status === 'maintenance' || item.kondisi === 'Rusak Berat') {
            return (
                <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 uppercase tracking-tight">
                    <XCircle className="w-3 h-3" />
                    <span>{t('catalog.maintenance')}</span>
                </div>
            )
        }
        if (item.stokTersedia === 0) {
            return (
                <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 uppercase tracking-tight">
                    <AlertCircle className="w-3 h-3" />
                    <span>{t('catalog.outOfStock')}</span>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 uppercase tracking-tight">
                <CheckCircle2 className="w-3 h-3" />
                <span>{t('catalog.available')}</span>
            </div>
        )
    }

    // Callbacks for CatalogCard
    const handleDetail = useCallback((item: Alat) => {
        setSelectedDetail(item)
    }, [])

    const openLoanModal = useCallback((item: Alat) => {
        setSelectedLoan(item)
        setLoanForm(prev => ({ ...prev, jumlah: 1 }))
    }, [])

    const handleLoan = useCallback((item: Alat) => {
        openLoanModal(item)
    }, [openLoanModal])

    const handleLoanSubmit = async () => {
        if (!selectedLoan) return;

        if (!loanForm.tanggalPinjam || !loanForm.tanggalKembali || !loanForm.keperluan) {
            toast.error(t('catalog.errorField'))
            return
        }

        if (loanForm.jumlah > selectedLoan.stokTersedia) {
            toast.error(t('catalog.errorStock'))
            return
        }

        const result = await createLoan({
            alatId: selectedLoan.id,
            tanggalPinjam: loanForm.tanggalPinjam,
            tanggalKembaliRencana: loanForm.tanggalKembali,
            jumlah: loanForm.jumlah,
            keperluan: loanForm.keperluan
        })

        if (result.success) {
            setSelectedLoan(null)
            setLoanForm({
                tanggalPinjam: new Date().toISOString().split('T')[0],
                tanggalKembali: '',
                jumlah: 1,
                keperluan: ''
            })
            fetchAlat({ limit: 100 }) // Refresh data
        }
    }

    const renderPaginationButtons = () => {
        const page = currentPage
        const buttons = []
        buttons.push(
            <Button key="prev" variant="outline" size="icon" className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-lg" disabled={page <= 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
        )
        const startPage = Math.max(1, page - 2)
        const endPage = Math.min(totalPages, page + 2)
        if (startPage > 1) {
            buttons.push(<Button key={1} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300" onClick={() => setCurrentPage(1)}>1</Button>)
            if (startPage > 2) buttons.push(<span key="dots1" className="px-1 text-slate-400">...</span>)
        }
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <Button key={i} variant="outline" size="sm" className={`h-9 w-9 p-0 rounded-lg ${i === page ? 'border-primary bg-primary/10 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`} onClick={() => setCurrentPage(i)}>{i}</Button>
            )
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttons.push(<span key="dots2" className="px-1 text-slate-400">...</span>)
            buttons.push(<Button key={totalPages} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button>)
        }
        buttons.push(
            <Button key="next" variant="outline" size="icon" className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-lg" disabled={page >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        )
        return buttons
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => fetchAlat({ limit: 100 })}>{t('common.tryAgain')}</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Wrench className="h-8 w-8 text-primary dark:text-blue-200" />
                            {t('catalog.heroTitle')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg max-w-2xl leading-relaxed">
                            {t('catalog.heroDesc')}
                        </p>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-4 mb-8 sticky top-0 z-20 backdrop-blur-xl bg-white/80 dark:bg-slate-800/80">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8 lg:col-span-8 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-primary text-base dark:text-white rounded-lg transition-all"
                                placeholder={t('catalog.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1) }}
                            />
                        </div>
                        <div className="md:col-span-4 lg:col-span-4">
                            <Select
                                value={selectedCategory || 'all'}
                                onValueChange={(value) => { setSelectedCategory(value === 'all' ? '' : value); setCurrentPage(1) }}
                            >
                                <SelectTrigger className="h-11 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-white focus:ring-2 focus:ring-primary">
                                    <SelectValue placeholder={t('catalog.allCategories')} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="all" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{t('catalog.allCategories')}</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={String(cat)} value={String(cat)} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">{String(cat)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Grid Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                    </div>
                ) : paginatedAlat.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4 border border-slate-200 dark:border-slate-700">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('catalog.noTools')}</h3>
                        <p className="text-sm mt-2 font-medium opacity-60 max-w-xs text-center">{t('catalog.noToolsDesc')}</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start mb-8">
                            {paginatedAlat.map((item) => (
                                <CatalogCard
                                    key={item.id}
                                    item={item}
                                    onDetail={handleDetail}
                                    onBorrow={handleLoan}
                                />
                            ))}
                        </div>
                        <div className="p-4 border border-slate-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-between rounded-xl shadow-sm mb-12">
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                                {t('common.showing')} <span className="font-extrabold text-slate-800 dark:text-white">{filteredAlat.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredAlat.length)}</span> {t('common.of')} <span className="font-extrabold text-slate-800 dark:text-white">{filteredAlat.length}</span> {t('common.data')}
                            </div>
                            <div className="flex items-center space-x-2">{renderPaginationButtons()}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 rounded-[2rem] gap-0 border-none shadow-2xl dark:bg-slate-950">
                    {selectedDetail && (
                        <div className="flex flex-col">
                            <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                                <img src={selectedDetail.gambar || 'https://placehold.co/600x400/e2e8f0/64748b?text=Tool+Image'} alt={selectedDetail.nama} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-primary/40">
                                            {selectedDetail.kategori?.nama || 'Umum'}
                                        </span>
                                        {getStatusBadge(selectedDetail)}
                                    </div>
                                    <DialogTitle className="text-3xl font-black text-white leading-tight drop-shadow-md">{selectedDetail.nama}</DialogTitle>
                                    <p className="text-white/60 font-mono text-sm tracking-widest mt-1 uppercase">{selectedDetail.kode}</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-8 bg-white dark:bg-slate-950">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 shadow-inner flex flex-col gap-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{t('catalog.availableStockCaps')}</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-primary leading-none">{selectedDetail.stokTersedia}</span>
                                            <span className="text-sm font-bold text-slate-400">/ {selectedDetail.stokTotal} {t('catalog.unit')}</span>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 shadow-inner flex flex-col gap-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{t('catalog.toolConditionCaps')}</p>
                                        <span className="text-xl font-black text-slate-800 dark:text-white leading-none mt-1">
                                            {(() => {
                                                const condition = selectedDetail.kondisi.toLowerCase();
                                                if (condition.includes('baik')) return t('returns.condition.good');
                                                if (condition.includes('rusak ringan')) return t('returns.condition.lightDamage');
                                                if (condition.includes('rusak berat')) return t('returns.condition.heavyDamage');
                                                if (condition.includes('rusak')) return t('returns.condition.damaged');
                                                if (condition.includes('hilang')) return t('returns.condition.lost');
                                                return selectedDetail.kondisi;
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('dashboard.table.description')}</h3>
                                    <div className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 italic">
                                        "{selectedDetail.deskripsi || t('catalog.noDescription')}"
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button variant="outline" onClick={() => setSelectedDetail(null)} className="flex-1 rounded-[1.25rem] h-14 font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                                        {t('common.back')}
                                    </Button>
                                    <Button
                                        onClick={() => { setSelectedDetail(null); openLoanModal(selectedDetail) }}
                                        disabled={selectedDetail.stokTersedia === 0 || selectedDetail.status === 'maintenance'}
                                        className="flex-[2] rounded-[1.25rem] h-14 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
                                    >
                                        {t('catalog.startBorrowing')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Loan Modal */}
            <Dialog open={!!selectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden dark:bg-slate-950">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">{t('catalog.borrowTitle')}</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            {t('catalog.borrowDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLoan && (
                        <div className="p-8 pt-6 space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10">
                                <div className="h-14 w-14 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 shadow-sm">
                                    <img src={selectedLoan.gambar || 'https://placehold.co/100x100/e2e8f0/64748b?text=Tool'} alt="thumbnail" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-mono text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">{selectedLoan.kode}</p>
                                    <p className="font-bold text-slate-900 dark:text-white line-clamp-1 leading-none">{selectedLoan.nama}</p>
                                    <p className="text-[10px] font-medium text-slate-500 mt-1">{t('catalog.available')}: {selectedLoan.stokTersedia}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('catalog.borrowDateCaps')}</Label>
                                    <Input
                                        type="date"
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary"
                                        value={loanForm.tanggalPinjam}
                                        onChange={(e) => setLoanForm({ ...loanForm, tanggalPinjam: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('catalog.returnPlanCaps')}</Label>
                                    <Input
                                        type="date"
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary"
                                        value={loanForm.tanggalKembali}
                                        onChange={(e) => setLoanForm({ ...loanForm, tanggalKembali: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('catalog.quantityCaps')}</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={selectedLoan.stokTersedia}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 pr-16 font-bold"
                                        value={loanForm.jumlah}
                                        onChange={(e) => setLoanForm({ ...loanForm, jumlah: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">{t('catalog.unit')}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('catalog.borrowPurposeCaps')}</Label>
                                <textarea
                                    className="flex min-h-[100px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                    placeholder={t('catalog.purposePlaceholder')}
                                    value={loanForm.keperluan}
                                    onChange={(e) => setLoanForm({ ...loanForm, keperluan: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button variant="ghost" onClick={() => setSelectedLoan(null)} disabled={submitting} className="flex-1 rounded-xl h-12 font-bold text-slate-500 uppercase tracking-widest">
                                    {t('common.cancel')}
                                </Button>
                                <Button onClick={handleLoanSubmit} disabled={submitting} className="flex-[2] rounded-xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('catalog.submit')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
