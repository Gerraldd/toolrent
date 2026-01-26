'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAlatDetail } from '@/hooks/use-alat-detail'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    Box,
    CheckCircle,
    XCircle,
    AlertCircle,
    ShoppingCart,
    Loader2
} from 'lucide-react'

export default function DetailAlatPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string
    const { data: alat, loading, error } = useAlatDetail(id)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error || !alat) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {error || 'Alat tidak ditemukan'}
                </h2>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/peminjam/katalog">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Katalog
                    </Link>
                </Button>
            </div>
        )
    }

    const available = alat.stokTersedia > 0 && alat.status === 'tersedia'

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background pb-20 animate-fade-in">
            {/* Header / Breadcrumb */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-[#1f3b61] dark:text-gray-400 dark:hover:text-blue-400"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Detail Alat
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left Column: Image */}
                    <div className="space-y-6">
                        <div className="relative aspect-square sm:aspect-video lg:aspect-square bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group">
                            {alat.gambar ? (
                                <Image
                                    src={alat.gambar}
                                    alt={alat.nama}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    priority
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                                    <Box className="h-24 w-24 opacity-20" />
                                </div>
                            )}

                            <div className="absolute top-4 right-4">
                                <Badge variant={available ? "default" : "destructive"} className={available ? "bg-green-500 hover:bg-green-600" : ""}>
                                    {available ? 'Tersedia' : 'Stok Habis'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="outline" className="text-[#1f3b61] border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                    {alat.kategori.nama}
                                </Badge>
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                {alat.nama}
                            </h1>

                            <div className="flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    Kode: <span className="font-mono font-medium text-gray-900 dark:text-gray-200">{alat.kode}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    Kondisi: <span className="font-medium text-gray-900 dark:text-gray-200 capitalize">{alat.kondisi}</span>
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-blue dark:prose-invert max-w-none">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deskripsi</h3>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {alat.deskripsi || 'Tidak ada deskripsi tersedia untuk alat ini.'}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                Informasi Stok
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Stok</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{alat.stokTotal}</div>
                                </div>
                                <div className={`p-4 rounded-lg ${available ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                    <div className={`text-sm mb-1 ${available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        Tersedia
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{alat.stokTersedia}</div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button
                                size="lg"
                                className={`w-full h-14 text-lg shadow-lg transition-all ${available
                                        ? 'bg-[#1f3b61] hover:bg-[#162a45] hover:shadow-xl hover:-translate-y-1'
                                        : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                    }`}
                                disabled={!available}
                            >
                                {available ? (
                                    <>
                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                        Ajukan Peminjaman
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="mr-2 h-5 w-5" />
                                        Stok Habis / Tidak Tersedia
                                    </>
                                )}
                            </Button>
                            {!available && (
                                <p className="text-center text-sm text-red-500 mt-3">
                                    Maaf, alat ini sedang tidak tersedia untuk dipinjam saat ini.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
