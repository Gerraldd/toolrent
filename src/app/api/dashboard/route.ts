import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { subDays, startOfDay, endOfDay, format, differenceInDays, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns'

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and petugas can access dashboard stats
        if (!hasRole(auth.user, 'admin') && !hasRole(auth.user, 'petugas')) {
            return NextResponse.json(
                { success: false, error: 'Akses ditolak' },
                { status: 403 }
            )
        }

        const prisma = await getPrisma()

        // Parse date range from query params
        const { searchParams } = new URL(request.url)
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        const today = new Date()

        // Use custom date range if provided, otherwise default to last 30 days
        const filterStartDate = startDateParam
            ? startOfDay(new Date(startDateParam))
            : subDays(today, 30)
        const filterEndDate = endDateParam
            ? endOfDay(new Date(endDateParam))
            : endOfDay(today)

        // Build date filter for queries that need it
        const dateFilter = {
            gte: filterStartDate,
            lte: filterEndDate
        }

        // Get all stats in parallel
        const [
            totalUsers,
            newUsersThisMonth,
            totalAlat,
            newAlatThisMonth,
            activeLoans,
            overdueLoans,
            loansInRange,
            categoryStats,
            recentActivities,
            recentLoansList,
            pendingCount,
            returnsInRangeCount,
            finesInRange
        ] = await Promise.all([
            // Total users count
            prisma.user.count(),

            // New users in date range
            prisma.user.count({
                where: {
                    createdAt: dateFilter
                }
            }),

            // Total alat count
            prisma.alat.count(),

            // New alat in date range
            prisma.alat.count({
                where: {
                    createdAt: dateFilter
                }
            }),

            // Active loans (dipinjam status)
            prisma.peminjaman.count({
                where: {
                    status: 'dipinjam'
                }
            }),

            // Overdue loans (status dipinjam and past due date)
            prisma.peminjaman.count({
                where: {
                    status: 'dipinjam',
                    tanggalKembaliRencana: {
                        lt: startOfDay(today)
                    }
                }
            }),

            // Loans in date range for chart
            prisma.peminjaman.findMany({
                where: {
                    createdAt: dateFilter
                },
                select: {
                    id: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'asc' }
            }),

            // Category statistics with loan counts in date range
            prisma.kategori.findMany({
                include: {
                    alat: {
                        include: {
                            peminjaman: {
                                where: {
                                    createdAt: dateFilter
                                },
                                select: { id: true }
                            }
                        }
                    }
                }
            }),

            // Recent activities in date range
            prisma.logAktivitas.findMany({
                where: {
                    createdAt: dateFilter
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nama: true,
                            email: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),

            // Recent loans for table
            prisma.peminjaman.findMany({
                where: {
                    createdAt: dateFilter
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nama: true,
                            email: true
                        }
                    },
                    alat: {
                        select: {
                            id: true,
                            nama: true,
                            gambar: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),

            // 11. Pending Validation (Status 'menunggu')
            prisma.peminjaman.count({
                where: {
                    status: 'menunggu'
                }
            }),

            // 12. Returns In Range (Count actual returns in Pengembalian table)
            prisma.pengembalian.count({
                where: {
                    createdAt: dateFilter
                }
            }),

            // 13. Total Fines In Range
            prisma.pengembalian.aggregate({
                _sum: {
                    totalDenda: true
                },
                where: {
                    createdAt: dateFilter
                }
            })
        ])

        // Process loans into daily chart data based on date range
        const chartData = processChartData(loansInRange, filterStartDate, filterEndDate)

        // Process category stats
        const categoryData = processCategoryStats(categoryStats)

        // Process recent activities
        const activities = processActivities(recentActivities, today)

        // Process recent loans
        // @ts-ignore - Types mismatch with prisma result vs helper input but structured matches
        const recentLoansData = processRecentLoans(recentLoansList)

        // Calculate growth percentage
        const usersLastMonth = await prisma.user.count({
            where: {
                createdAt: {
                    lt: startOfDay(subDays(today, 30))
                }
            }
        })
        const userGrowth = usersLastMonth > 0
            ? Math.round((newUsersThisMonth / usersLastMonth) * 100)
            : newUsersThisMonth > 0 ? 100 : 0

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    newUsersThisMonth,
                    userGrowth,
                    totalAlat,
                    newAlatThisMonth,
                    activeLoans,
                    overdueLoans,
                    pendingCount: pendingCount || 0,
                    returnsInRangeCount: returnsInRangeCount || 0,
                    finesInRange: Number(finesInRange._sum.totalDenda || 0)
                },
                chartData: chartData,
                categoryStats: categoryData,
                recentActivities: activities,
                recentLoans: recentLoansData
            }
        })

    } catch (error) {
        console.error('Error fetching dashboard data:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to process chart data (Daily)
function processChartData(
    loans: { id: number; createdAt: Date }[],
    startDate: Date,
    endDate: Date
) {
    // Generate all days in the range
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    return days.map(day => {
        const count = loans.filter(loan =>
            isSameDay(new Date(loan.createdAt), day)
        ).length

        return {
            label: format(day, 'd MMM yyyy'), // Daily label
            date: format(day, 'yyyy-MM-dd'), // Full date for ref
            count
        }
    })
}

// Helper function to process category stats
function processCategoryStats(
    categories: Array<{
        id: number
        nama: string
        alat: Array<{
            peminjaman: Array<{ id: number }>
        }>
    }>
) {
    const categoryLoanCounts = categories.map(cat => {
        const totalLoans = cat.alat.reduce((sum, alat) => sum + alat.peminjaman.length, 0)
        const alatCount = cat.alat.length
        return {
            id: cat.id,
            name: cat.nama,
            alatCount,
            loanCount: totalLoans
        }
    })

    // Sort by loan count descending
    categoryLoanCounts.sort((a, b) => b.loanCount - a.loanCount)

    // Take top 4 categories
    const top4 = categoryLoanCounts.slice(0, 4)
    const totalLoans = categoryLoanCounts.reduce((sum, cat) => sum + cat.loanCount, 0)

    // Calculate percentages
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
    return top4.map((cat, idx) => ({
        ...cat,
        color: colors[idx] || '#6B7280',
        percentage: totalLoans > 0 ? Math.round((cat.loanCount / totalLoans) * 100) : 0
    }))
}

// Helper function to process activities
function processActivities(
    logs: Array<{
        id: number
        aksi: string
        tabel: string | null
        deskripsi: string | null
        recordId: number | null
        ipAddress: string | null
        createdAt: Date
        user: { id: number; nama: string; email: string; role: string } | null
    }>,
    today: Date
) {
    const actionColors: Record<string, string> = {
        'CREATE': 'bg-green-100 text-green-600',
        'UPDATE': 'bg-blue-100 text-blue-600',
        'DELETE': 'bg-red-100 text-red-600',
        'LOGIN': 'bg-purple-100 text-purple-600',
        'LOGOUT': 'bg-gray-100 text-gray-600',
        'APPROVE': 'bg-emerald-100 text-emerald-600',
        'REJECT': 'bg-red-100 text-red-600',
        'RETURN': 'bg-yellow-100 text-yellow-600'
    }

    return logs.map(log => {
        const diffMins = differenceInDays(today, log.createdAt) === 0
            ? Math.round((today.getTime() - new Date(log.createdAt).getTime()) / 60000)
            : null

        let timeAgo = ''
        if (diffMins !== null) {
            if (diffMins < 1) {
                timeAgo = 'Baru saja'
            } else if (diffMins < 60) {
                timeAgo = `${diffMins} menit lalu`
            } else {
                const hours = Math.floor(diffMins / 60)
                timeAgo = `${hours} jam lalu`
            }
        } else {
            const days = differenceInDays(today, log.createdAt)
            timeAgo = `${days} hari lalu`
        }

        const userName = log.user?.nama || 'System'
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

        return {
            id: log.id,
            user: userName,
            userEmail: log.user?.email || '-',
            userRole: log.user?.role || 'SYSTEM',
            initials,
            action: formatAction(log.aksi, log.tabel),
            actionType: log.aksi,
            item: log.deskripsi || log.tabel || '-',
            time: timeAgo,
            timestamp: log.createdAt.toISOString(),
            color: actionColors[log.aksi.toUpperCase()] || 'bg-gray-100 text-gray-600',
            // Detailed fields
            tabel: log.tabel || undefined,
            recordId: log.recordId ? Number(log.recordId) : undefined, // Ensure number if stored as BigInt/string
            deskripsi: log.deskripsi || undefined,
            ipAddress: log.ipAddress || undefined
        }
    })
}

// Helper function to format action text
function formatAction(aksi: string, tabel: string | null): string {
    const actionMap: Record<string, string> = {
        'CREATE': 'menambah',
        'UPDATE': 'mengubah',
        'DELETE': 'menghapus',
        'LOGIN': 'masuk sistem',
        'LOGOUT': 'keluar sistem',
        'APPROVE': 'menyetujui',
        'REJECT': 'menolak',
        'RETURN': 'memproses pengembalian'
    }

    const tableMap: Record<string, string> = {
        'peminjaman': 'peminjaman',
        'pengembalian': 'pengembalian',
        'alat': 'alat',
        'users': 'user',
        'kategori': 'kategori'
    }

    const action = actionMap[aksi.toUpperCase()] || aksi.toLowerCase()
    const table = tabel ? tableMap[tabel.toLowerCase()] || tabel : ''

    return table ? `${action} ${table}` : action
}

// Helper function to process recent loans
function processRecentLoans(
    loans: Array<{
        id: number
        user: { id: number; nama: string; email: string }
        alat: { id: number; nama: string; gambar: string | null }
        tanggalPinjam: Date
        tanggalKembaliRencana: Date
        status: string
        createdAt: Date
    }>
) {
    return loans.map(loan => ({
        id: loan.id,
        user: loan.user.nama,
        userId: loan.user.id,
        userEmail: loan.user.email,
        alat: loan.alat.nama,
        alatId: loan.alat.id,
        alatImage: loan.alat.gambar,
        tanggalPinjam: format(new Date(loan.tanggalPinjam), 'd MMM yyyy'),
        tanggalKembali: format(new Date(loan.tanggalKembaliRencana), 'd MMM yyyy'),
        status: loan.status,
        createdAt: loan.createdAt.toISOString()
    }))
}
