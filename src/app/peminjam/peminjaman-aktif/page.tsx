'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useActiveLoans } from '@/hooks/use-active-loans'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    ClipboardList,
    Wrench,
    Loader2
} from 'lucide-react'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function ActiveLoansPage() {
    const router = useRouter()
    const { data: loans, loading, error } = useActiveLoans()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-[#1f3b61]" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
                <div className="text-red-500 mb-2">Error: {error}</div>
                <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background pb-20 animate-fade-in">
            {/* Header */}
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
                        Pinjaman Aktif
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Pinjaman Saya
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Pantau status pengembalian peralatan yang sedang kamu pinjam.
                    </p>
                </div>

                {loans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                            <ClipboardList className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                            Tidak ada pinjaman aktif
                        </h3>
                        <p className="text-gray-500 text-center max-w-sm mb-6">
                            Kamu sedang tidak meminjam alat apapun saat ini.
                        </p>
                        <Button asChild className="bg-[#1f3b61] hover:bg-[#162a45]">
                            <Link href="/peminjam/katalog">Mulai Pinjam Alat</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loans.map((loan) => {
                            const today = new Date()
                            const returnDate = parseISO(loan.tanggalKembaliRencana)
                            const daysLeft = differenceInCalendarDays(returnDate, today)
                            const isOverdue = daysLeft < 0

                            return (
                                <div key={loan.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-1">
                                        <div className="flex gap-4 p-4">
                                            <div className="relative h-20 w-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                                {loan.alat.gambar ? (
                                                    <Image
                                                        src={loan.alat.gambar}
                                                        alt={loan.alat.nama}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full w-full">
                                                        <Wrench className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {loan.alat.nama}
                                                </h3>
                                                <div className="text-xs text-gray-500 mb-2">Kode: {loan.alat.kode}</div>
                                                <Badge variant="outline" className="text-[#1f3b61] border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                                    {loan.jumlah} Unit
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-5 pb-5 pt-0 space-y-3">
                                        <div className="flex items-center justify-between text-sm py-3 border-t border-b border-gray-50 dark:border-gray-700/50">
                                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                <span>Dipinjam</span>
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {format(parseISO(loan.tanggalPinjam), 'dd MMM yyyy', { locale: localeId })}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>Tenggat</span>
                                            </div>
                                            <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                                {format(returnDate, 'dd MMM yyyy', { locale: localeId })}
                                            </span>
                                        </div>

                                        <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${isOverdue
                                            ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                                            : daysLeft <= 2
                                                ? 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                                                : 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                            }`}>
                                            {isOverdue ? (
                                                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                            ) : (
                                                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                            )}
                                            <div className="text-sm font-medium">
                                                {isOverdue
                                                    ? `Terlambat ${Math.abs(daysLeft)} hari`
                                                    : `${daysLeft} hari lagi`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
