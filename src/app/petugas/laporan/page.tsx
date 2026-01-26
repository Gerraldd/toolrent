'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    FileText,
    FileSpreadsheet,
    Calendar,
    ClipboardList,
    RotateCcw,
    AlertCircle,
    Download,
    Printer,
    Loader2
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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

interface Kategori {
    id: number
    nama: string
}

const ReportCard = ({
    title,
    description,
    icon,
    type,
    colorClass,
    loading,
    categories,
    onExport,
    t
}: {
    title: string,
    description: string,
    icon: React.ReactNode,
    type: string,
    colorClass: string,
    loading: string | null,
    categories: Kategori[],
    onExport: (type: string, format: 'pdf' | 'excel', startDate: string, endDate: string, kategori: string) => void,
    t: (key: string) => string
}) => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [kategori, setKategori] = useState('all')

    const handleExportClick = (format: 'pdf' | 'excel') => {
        // Only validate date order if both dates are provided
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            toast.error(t('reports.dateInvalid'))
            return
        }
        onExport(type, format, startDate, endDate, kategori)
    }

    return (
        <Card className="flex flex-col h-full border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-lg">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</CardTitle>
                        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{description}</CardDescription>
                    </div>
                    <div className={`p-3 rounded-full ${colorClass} shadow-md flex items-center justify-center`}>
                        {icon}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 dark:text-slate-400">{t('reports.fromDate')}</Label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                type="date"
                                className="pl-8 h-9 text-xs bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500 dark:text-slate-400">{t('reports.toDate')}</Label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                type="date"
                                className="pl-8 h-9 text-xs bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">{t('reports.categoryFilter')}</Label>
                    <Select value={kategori} onValueChange={setKategori}>
                        <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                            <SelectValue placeholder={t('reports.allCategories')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('reports.allCategories')}</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.nama}>{cat.nama}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="w-full justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 rounded-md"
                    onClick={() => handleExportClick('excel')}
                    disabled={!!loading}
                >
                    {loading === `${type}-excel` ? (
                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                    )}
                    Excel
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 rounded-md"
                    onClick={() => handleExportClick('pdf')}
                    disabled={!!loading}
                >
                    {loading === `${type}-pdf` ? (
                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                        <FileText className="w-4 h-4" />
                    )}
                    PDF
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function LaporanPage() {
    const { t } = useLanguage()
    const [loading, setLoading] = useState<string | null>(null)
    const [pageLoading, setPageLoading] = useState(true)
    const [helpOpen, setHelpOpen] = useState(false)
    const [categories, setCategories] = useState<Kategori[]>([])

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/kategori')
                const result = await response.json()
                if (result.success) {
                    setCategories(result.data)
                }
            } catch (error) {
                console.error('Fetch categories error:', error)
            } finally {
                setPageLoading(false)
            }
        }
        fetchCategories()
    }, [])

    const handleExport = async (type: string, format: 'pdf' | 'excel', startDate: string, endDate: string, kategori: string) => {
        setLoading(`${type}-${format}`)

        try {
            const params = new URLSearchParams({
                type: type.toLowerCase(),
                format,
                kategori
            })

            // Only add date params if they are provided
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const response = await fetch(`/api/laporan?${params.toString()}`)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Gagal generate laporan')
            }

            // Get the blob and download
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url

            // Set filename based on whether dates are provided
            const dateRange = startDate && endDate
                ? `${startDate}_${endDate}`
                : 'Semua_Periode'
            a.download = `Laporan_${type}_${dateRange}.${format === 'pdf' ? 'pdf' : 'xlsx'}`

            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success(t('reports.exportSuccess').replace('{type}', type).replace('{format}', format.toUpperCase()))
        } catch (error: any) {
            console.error('Export error:', error)
            toast.error(error.message || t('reports.exportFailed'))
        } finally {
            setLoading(null)
        }
    }

    if (pageLoading) {
        return (
            <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in text-slate-900 dark:text-slate-100">
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <Printer className="h-8 w-8 text-primary dark:text-blue-200" />
                            {t('reports.title')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                            {t('reports.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Report Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Laporan Peminjaman */}
                    <ReportCard
                        title={t('reports.loanReport')}
                        description={t('reports.loanReportDesc')}
                        icon={<ClipboardList className="w-6 h-6 text-white" />}
                        type="Peminjaman"
                        colorClass="bg-blue-500"
                        loading={loading}
                        categories={categories}
                        onExport={handleExport}
                        t={t}
                    />

                    {/* Laporan Pengembalian */}
                    <ReportCard
                        title={t('reports.returnReport')}
                        description={t('reports.returnReportDesc')}
                        icon={<RotateCcw className="w-6 h-6 text-white" />}
                        type="Pengembalian"
                        colorClass="bg-purple-500"
                        loading={loading}
                        categories={categories}
                        onExport={handleExport}
                        t={t}
                    />

                    {/* Laporan Denda & Pelanggaran */}
                    <ReportCard
                        title={t('reports.fineReport')}
                        description={t('reports.fineReportDesc')}
                        icon={<AlertCircle className="w-6 h-6 text-white" />}
                        type="Denda"
                        colorClass="bg-orange-500"
                        loading={loading}
                        categories={categories}
                        onExport={handleExport}
                        t={t}
                    />

                </div>

                {/* Petunjuk Export Section */}
                <div className="mt-10 relative overflow-hidden rounded-2xl bg-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 group min-h-[180px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-64 h-64 -mr-20 -mt-20 text-white transform -rotate-12" />
                    </div>

                    <div className="relative z-10 p-10 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white/10 rounded-2xl text-white shrink-0 backdrop-blur-sm border border-white/10">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white leading-tight">
                                    {t('reports.exportGuide')}
                                </h3>
                                <p className="text-white/80 text-sm leading-relaxed max-w-lg">
                                    {t('reports.guideDescription')}
                                </p>
                            </div>
                        </div>

                        <div className="flex-shrink-0 w-full md:w-auto">
                            <Button
                                variant="ghost"
                                className="w-full md:w-auto h-12 px-6 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all font-medium text-base shadow-sm backdrop-blur-sm"
                                onClick={() => setHelpOpen(true)}
                            >
                                <Download className="w-5 h-5 mr-2" />
                                {t('reports.needHelp')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help Dialog */}
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary dark:text-blue-200" />
                            {t('reports.guideTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('reports.guideSubtitle')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid gap-4">
                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                    1
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{t('reports.step1Title')}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {t('reports.step1Desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                    2
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{t('reports.step2Title')}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {t('reports.step2Desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                    3
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{t('reports.step3Title')}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {t('reports.step3Desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                    4
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{t('reports.step4Title')}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {t('reports.step4Desc')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setHelpOpen(false)} className="dark:bg-brand-primary dark:text-white dark:hover:bg-brand-primary/90">{t('reports.understand')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
