'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePeminjamHome } from '@/hooks/use-peminjam-home'
import { useLanguage } from '@/contexts/language-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Search,
    Wrench,
    ArrowRight,
    ClipboardList,
    Clock,
    Grid,
    Sparkles,
    Box,
    Loader2,
    Zap,
    TrendingUp,
    ShieldAlert,
    ArrowUpRight,
    Info,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function BerandaPeminjam() {
    const { data: session } = useSession()
    const router = useRouter()
    const { t } = useLanguage()
    const { data, loading, error } = usePeminjamHome()
    const [selectedDetail, setSelectedDetail] = useState<any>(null)


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50/50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-brand-primary dark:text-blue-400" />
                        <div className="absolute inset-0 h-12 w-12 animate-pulse rounded-full bg-brand-primary/10 dark:bg-blue-900/20" />
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <div className="max-w-md w-full bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('common.error')}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">
                        {t('common.tryAgain')}
                    </Button>
                </div>
            </div>
        )
    }

    const userName = session?.user?.nama?.split(' ')[0] || 'Peminjam'
    const activeLoanCount = data?.activeLoanCount || 0
    const categories = data?.categories || []
    const featuredTools = data?.featuredTools || []

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-950 dark:text-slate-50 selection:bg-blue-100 dark:selection:bg-blue-900/30">
            {/* Header / Hero Section */}
            <div className="relative pt-12 pb-32 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-brand-primary to-[#12253d] dark:from-slate-900 dark:to-slate-950 z-0" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute bottom-40 left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-semibold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Sparkles className="h-3 w-3 text-yellow-300" />
                                <span>{t('home.hero.subtitle')}</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                                {t('home.hero.title', { name: userName })}
                            </h1>
                            <p className="text-sm text-blue-100/80 max-w-lg mb-8 leading-relaxed">
                                {t('home.hero.description')}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Button
                                    onClick={() => router.push('/peminjam/katalog')}
                                    className="rounded-2xl bg-white text-brand-primary hover:bg-blue-50 font-bold px-12 h-14 shadow-xl shadow-black/20 transition-all active:scale-95 group"
                                >
                                    <Search className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                    {t('home.hero.search')}
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="rounded-2xl border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 font-bold px-8 h-14 transition-all"
                                >
                                    <Link href="/peminjam/peminjaman">
                                        {t('home.hero.history')}
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="hidden lg:flex gap-4">
                            <div className="w-48 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] text-white">
                                <div className="p-3 bg-blue-500/20 rounded-2xl w-fit mb-4">
                                    <ClipboardList className="h-6 w-6 text-blue-300" />
                                </div>
                                <div className="text-3xl font-bold mb-1">{activeLoanCount}</div>
                                <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">{t('home.stats.activeLoans')}</div>
                            </div>
                            <div className="w-48 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] text-white">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl w-fit mb-4">
                                    <TrendingUp className="h-6 w-6 text-emerald-300" />
                                </div>
                                <div className="text-3xl font-bold mb-1">{categories.length}</div>
                                <div className="text-xs font-medium text-emerald-200 uppercase tracking-wider">{t('home.stats.categories')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-22 relative z-20 pb-24">

                {/* Active Loans Notification */}
                {activeLoanCount > 0 && (
                    <div className="group relative mb-16 overflow-hidden bg-brand-primary dark:bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/20">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Zap className="h-32 w-32 text-blue-400" />
                        </div>
                        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                    <Clock className="h-8 w-8 text-blue-300" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">{t('home.alert.title')}</h3>
                                    <p className="text-blue-100/70 text-sm">
                                        {t('home.alert.description', { count: activeLoanCount })}
                                    </p>
                                </div>
                            </div>
                            <Button asChild size="lg" className="bg-white text-brand-primary hover:bg-blue-50 font-bold rounded-2xl px-8 py-7 shadow-xl hover:shadow-white/10 transition-all active:scale-95 group border-none">
                                <Link href="/peminjam/peminjaman-aktif" className="flex items-center gap-2">
                                    {t('home.alert.button')} <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Categories Section - Bento Style */}
                <section className={`mb-20 ${activeLoanCount === 0 ? 'mt-24' : ''}`}>
                    <div className="flex items-end justify-between mb-8 px-2">
                        <div>
                            <Badge variant="outline" className="mb-2 border-brand-primary/20 text-brand-primary dark:border-blue-900 dark:text-blue-400 rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                                {t('home.categories.badge')}
                            </Badge>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('home.categories.title')}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {categories.slice(0, 10).map((category, idx) => (
                            <Link
                                key={category.id}
                                href={`/peminjam/katalog?category=${category.id}`}
                                className="group relative bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-brand-primary/10 hover:border-brand-primary/30 dark:hover:border-blue-900/50 transition-all duration-500 overflow-hidden flex flex-col items-start gap-4"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-brand-primary/10 dark:group-hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 group-hover:text-brand-primary dark:group-hover:text-blue-400 transition-all duration-300">
                                    <Box className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                </div>

                                <div className="relative mt-auto">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-primary dark:group-hover:text-blue-400 transition-colors leading-tight mb-1">
                                        {category.nama}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {category._count?.alat || 0} {t('home.categories.items')}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Featured Tools - Modern Card Grid */}
                <section>
                    <div className="flex items-end justify-between mb-8 px-2">
                        <div>
                            <Badge variant="outline" className="mb-2 border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400 rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                                {t('home.tools.badge')}
                            </Badge>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('home.tools.title')}</h2>
                        </div>
                        <Button asChild variant="ghost" className="rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Link href="/peminjam/katalog">
                                {t('home.tools.viewAll')} <Grid className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredTools.map((tool, idx) => (
                            <div
                                key={tool.id}
                                className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 overflow-hidden"
                            >
                                {/* Tool Image Container */}
                                <div className="aspect-[16/10] relative overflow-hidden m-3 rounded-[2rem]">
                                    {tool.gambar ? (
                                        <Image
                                            src={tool.gambar}
                                            alt={tool.nama}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-1000"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <Wrench className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                        </div>
                                    )}

                                    <div className="absolute top-4 left-4">
                                        <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5">
                                            {tool.kategori?.nama || t('returns.tool').toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Status Badge Over Image */}
                                    <div className="absolute bottom-4 left-4">
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${tool.status === 'tersedia'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                            }`}>
                                            <div className={`h-1.5 w-1.5 rounded-full ${tool.status === 'tersedia' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                                            {tool.status === 'tersedia' ? t('home.tools.available') : t('home.tools.borrowed')}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-8 pt-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-primary dark:group-hover:text-blue-400 transition-colors duration-300">
                                            {tool.nama}
                                        </h3>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed">
                                        {tool.deskripsi || t('home.tools.defaultDesc')}
                                    </p>

                                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-1 w-1 bg-slate-100 dark:bg-slate-800" />
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() => setSelectedDetail(tool)}
                                            variant="ghost"
                                            className="h-auto p-0 hover:bg-transparent group/btn"
                                        >
                                            <div className="flex items-center gap-2 text-sm font-bold text-brand-primary dark:text-blue-400">
                                                {t('home.tools.detail')}
                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full group-hover/btn:bg-brand-primary group-hover/btn:text-white transition-all">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Detail Modal - Reused from KatalogPage for consistency */}
            <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
                <DialogContent className="sm:max-w-[600px] p-0 rounded-[2rem] border-none shadow-2xl overflow-hidden dark:bg-slate-950">
                    <div className="max-h-[90vh] overflow-y-scroll overflow-x-hidden scrollbar-hide sm:scrollbar-default">
                        {selectedDetail && (
                            <div className="flex flex-col">
                                {/* Modal Image Header */}
                                <div className="aspect-[16/9] w-full relative bg-slate-100 dark:bg-slate-800">
                                    {selectedDetail.gambar ? (
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={selectedDetail.gambar}
                                                alt={selectedDetail.nama}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Wrench className="h-16 w-16 text-slate-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest text-brand-primary dark:text-blue-400 shadow-xl ring-1 ring-black/5">
                                        {selectedDetail.kategori?.nama || t('returns.tool').toUpperCase()}
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    <DialogHeader className="text-left">
                                        <DialogTitle className="text-xl font-black text-brand-primary dark:text-white leading-tight mb-1">
                                            {selectedDetail.nama}
                                        </DialogTitle>
                                        <div className="flex items-center gap-2 font-mono text-sm text-slate-400 dark:text-slate-500">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{t('loans.code').toUpperCase()}: {selectedDetail.kode}</span>
                                        </div>
                                    </DialogHeader>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-3xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">{t('catalog.availableStockCaps')}</p>
                                            <p className="text-lg font-black text-brand-primary dark:text-white">
                                                {selectedDetail.stokTersedia || 0} <span className="text-xs font-bold text-slate-400">/ {selectedDetail.stokTotal || 0} {t('catalog.unit')}</span>
                                            </p>
                                        </div>
                                        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t('catalog.toolConditionCaps')}</p>
                                            <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                                                {(() => {
                                                    const condition = (selectedDetail.kondisi || 'Baik').toLowerCase();
                                                    if (condition.includes('baik')) return t('returns.condition.good');
                                                    if (condition.includes('rusak ringan')) return t('returns.condition.lightDamage');
                                                    if (condition.includes('rusak berat')) return t('returns.condition.heavyDamage');
                                                    if (condition.includes('rusak')) return t('returns.condition.damaged');
                                                    if (condition.includes('hilang')) return t('returns.condition.lost');
                                                    return selectedDetail.kondisi || 'Baik';
                                                })()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                            <Info className="h-4 w-4 text-blue-500" />
                                            {t('dashboard.table.description')}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                            {selectedDetail.deskripsi || t('home.tools.noDesc')}
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedDetail(null)}
                                        className="flex-1 rounded-2xl h-14 font-bold border-slate-200 dark:border-slate-800"
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/peminjam/katalog`)}
                                        className="flex-[2] rounded-2xl h-14 font-bold bg-brand-primary hover:bg-blue-800 shadow-xl shadow-blue-900/10"
                                        disabled={selectedDetail.stokTersedia === 0}
                                    >
                                        {t('home.tools.detail')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
