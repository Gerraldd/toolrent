'use client'

import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/language-context'
import {
    ClipboardList,
    Info,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react'

// Define interface locally to match the one in page.tsx
export interface Alat {
    id: number
    kode: string
    nama: string
    kategoriId?: number
    kategori?: { id: number; nama: string }
    deskripsi?: string
    gambar?: string
    stokTotal: number
    stokTersedia: number
    kondisi: string
    status: string
}

interface CatalogCardProps {
    item: Alat
    onDetail: (item: Alat) => void
    onBorrow: (item: Alat) => void
}

const CatalogCard = memo(({ item, onDetail, onBorrow }: CatalogCardProps) => {
    const { t } = useLanguage()

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

    return (
        <div
            className="group bg-white dark:bg-slate-800/80 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
        >
            <div className="aspect-[5/4] bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <img
                    src={item.gambar || 'https://placehold.co/600x400/e2e8f0/64748b?text=Tool+Image'}
                    alt={item.nama}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Tool+Image' }}
                />

                {/* Simplified Overlay - Removed heavy gradients/blurs if possible, but keeping essential visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-3 right-3">
                    {/* Removed backdrop-blur-md, used solid semi-transparent background for performance */}
                    <span className="bg-white/95 dark:bg-slate-900/95 text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {item.kategori?.nama || 'Umum'}
                    </span>
                </div>
                <div className="absolute bottom-3 left-3">
                    {getStatusBadge(item)}
                </div>
            </div>
            <div className="p-5 flex flex-col flex-1 gap-2">
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold font-mono text-primary uppercase tracking-widest opacity-80">{item.kode}</p>
                            <span className="text-[10px] text-slate-400 font-medium">•</span>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('catalog.available')}: {item.stokTersedia} {t('catalog.unit')}</p>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight line-clamp-2 min-h-[3rem]" title={item.nama}>{item.nama}</h3>
                    </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 flex-1 font-medium leading-relaxed italic opacity-80">"{item.deskripsi || t('catalog.noDescription')}"</p>
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl h-10 font-bold border-slate-200 dark:border-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
                        onClick={() => onDetail(item)}
                    >
                        <Info className="w-4 h-4 mr-2 text-primary dark:text-cyan-400" />{t('common.details')}
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 rounded-xl h-10 font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
                        disabled={item.stokTersedia === 0 || item.status === 'maintenance'}
                        onClick={() => onBorrow(item)}
                    >
                        <ClipboardList className="w-4 h-4 mr-2" />{t('catalog.borrow')}
                    </Button>
                </div>
            </div>
        </div>
    )
})

CatalogCard.displayName = 'CatalogCard'

export default CatalogCard
