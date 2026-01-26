"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { motion, Variants } from "framer-motion"
import {
    Clock,
    AlertCircle,
    Search,
    ArrowRight,
    Package,
    Calendar,
    CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePeminjaman } from "@/hooks/use-peminjaman"
import { useAlat } from "@/hooks/use-alat"

export default function DashboardPeminjam() {
    const { data: session } = useSession()
    const { data: loans, loading: loansLoading } = usePeminjaman({ limit: 5 })
    const { alat: recentAlat, loading: alatLoading } = useAlat({ limit: 4 })

    const activeLoansCount = loans.filter(l => ['menunggu', 'disetujui', 'dipinjam', 'terlambat'].includes(l.status)).length
    const lateLoansCount = loans.filter(l => l.status === 'terlambat').length
    const completedLoansCount = loans.filter(l => l.status === 'dikembalikan').length

    // AOS-like Variants
    const fadeUp: Variants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    }

    const fadeIn: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.8 }
        }
    }

    const staggerContainer: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.2
            }
        }
    }

    const scaleIn: Variants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 100, damping: 15 }
        }
    }

    return (
        <div className="p-6 space-y-12 min-h-screen bg-transparent">
            {/* Welcome Banner */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl"
            >
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl opacity-50 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md px-3 py-1 mb-2">
                                Dashboard Peminjam
                            </Badge>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="text-3xl md:text-4xl font-bold tracking-tight"
                        >
                            Halo, {session?.user?.nama || 'Peminjam'}! 👋
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.9 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="text-blue-100 max-w-xl text-lg"
                        >
                            Selamat datang di sistem peminjaman alat. Apa yang ingin kamu pinjam hari ini?
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        className="flex flex-wrap gap-3"
                    >
                        <Link href="/peminjam/katalog">
                            <Button size="lg" className="bg-white text-indigo-600 hover:bg-blue-50 shadow-lg border-0 font-semibold">
                                <Search className="mr-2 h-5 w-5" />
                                Cari Alat
                            </Button>
                        </Link>
                        <Link href="/peminjam/peminjaman-aktif">
                            <Button size="lg" variant="outline" className="bg-indigo-500/20 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm">
                                <Clock className="mr-2 h-5 w-5" />
                                Pinjaman Aktif
                            </Button>
                        </Link>
                        <Link href="/peminjam/peminjaman">
                            <Button size="lg" variant="outline" className="bg-indigo-500/20 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm">
                                <Package className="mr-2 h-5 w-5" />
                                Peminjaman Saya
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <motion.div variants={scaleIn}>
                    <Link href="/peminjam/peminjaman-aktif">
                        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 overflow-hidden relative group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                            <div className="absolute right-0 top-0 h-24 w-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Peminjaman Aktif</CardTitle>
                                <Clock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-gray-800 dark:text-gray-100">{activeLoansCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">Sedang diproses atau dipinjam</p>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>

                <motion.div variants={scaleIn}>
                    <Card className="border-none shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 overflow-hidden relative group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="absolute right-0 top-0 h-24 w-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Perlu Perhatian</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-gray-800 dark:text-gray-100">{lateLoansCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">Terlambat pengembalian</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={scaleIn}>
                    <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 overflow-hidden relative group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="absolute right-0 top-0 h-24 w-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Selesai</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-gray-800 dark:text-gray-100">{completedLoansCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">Peminjaman berhasil dikembalikan</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Section */}
                <motion.div
                    className="lg:col-span-2 space-y-6"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeUp} className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white flex items-center gap-2">
                            <Calendar className="h-6 w-6 text-indigo-500" />
                            Aktivitas Terbaru
                        </h2>
                        <Link href="/peminjam/peminjaman">
                            <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-800">
                                Lihat Semua <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </motion.div>

                    <div className="space-y-4">
                        {loansLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <motion.div key={i} variants={fadeUp}>
                                    <Card className="animate-pulse">
                                        <CardContent className="h-24" />
                                    </Card>
                                </motion.div>
                            ))
                        ) : loans.length === 0 ? (
                            <motion.div variants={fadeUp}>
                                <Card className="border-dashed border-2 bg-gray-50/50 dark:bg-slate-800/50">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-full mb-4">
                                            <Package className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Belum ada aktivitas</h3>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-1 mb-4">
                                            Kamu belum melakukan peminjaman apapun. Yuk mulai pinjam alat!
                                        </p>
                                        <Link href="/peminjam/katalog">
                                            <Button variant="outline">Cari Alat</Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            loans.slice(0, 3).map((loan) => (
                                <motion.div key={loan.id} variants={fadeUp}>
                                    <Card className="overflow-hidden border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
                                        <CardContent className="p-0">
                                            <div className="flex items-center p-4 gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                                    <Package className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                            {loan.alat?.nama || 'Alat'}
                                                        </h4>
                                                        <Badge variant={
                                                            loan.status === 'disetujui' ? 'secondary' : // Using secondary as default/success proxy
                                                                loan.status === 'menunggu' ? 'secondary' :
                                                                    loan.status === 'terlambat' ? 'destructive' : 'outline'
                                                        } className={`capitalize ${loan.status === 'disetujui' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' :
                                                            loan.status === 'menunggu' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' : ''
                                                            }`}>
                                                            {loan.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 gap-4">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {new Date(loan.tanggalPinjam).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{loan.jumlah} unit</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Recommendations / New Tools */}
                <motion.div
                    className="space-y-6"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeUp} className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">
                            Katalog Alat
                        </h2>
                        <Link href="/peminjam/katalog">
                            <Button variant="link" className="text-indigo-600 px-0">
                                Lihat Semua
                            </Button>
                        </Link>
                    </motion.div>

                    <div className="grid gap-4">
                        {alatLoading ? (
                            Array(2).fill(0).map((_, i) => (
                                <motion.div key={i} variants={fadeUp}>
                                    <Card className="animate-pulse">
                                        <CardContent className="h-48" />
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            recentAlat.slice(0, 3).map((tool) => (
                                <motion.div key={tool.id} variants={fadeUp}>
                                    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                        <div className="relative h-32 w-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                            {tool.gambar ? (
                                                <img
                                                    src={tool.gambar}
                                                    alt={tool.nama}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <Package className="h-8 w-8" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2">
                                                <Badge variant={tool.stokTersedia > 0 ? "secondary" : "destructive"} className="bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm">
                                                    Stok: {tool.stokTersedia}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                                                {tool.nama}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                                {tool.deskripsi || 'Tidak ada deskripsi'}
                                            </p>
                                            <Link href={`/peminjam/katalog/${tool.id}`} className="block">
                                                <Button size="sm" className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white dark:text-slate-900 transition-colors">
                                                    Detail
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
