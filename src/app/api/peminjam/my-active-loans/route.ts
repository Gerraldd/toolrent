import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

// GET /api/peminjam/my-active-loans - Get current user's active loans (for return form)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        const userId = parseInt(session.user.id)

        // Get active loans (dipinjam or disetujui status)
        const activeLoans = await prisma.peminjaman.findMany({
            where: {
                userId,
                status: { in: ['dipinjam', 'disetujui'] },
                pengembalian: null, // Not yet returned
            },
            include: {
                alat: {
                    select: {
                        id: true,
                        kode: true,
                        nama: true,
                        gambar: true,
                    }
                }
            },
            orderBy: { tanggalPinjam: 'desc' },
        })

        // Transform data for frontend
        const transformedData = activeLoans.map((loan) => ({
            id: loan.id,
            kode: loan.kode,
            alat: loan.alat,
            tanggalPinjam: loan.tanggalPinjam.toISOString().split('T')[0],
            tanggalKembaliRencana: loan.tanggalKembaliRencana.toISOString().split('T')[0],
            jumlah: loan.jumlah,
            keperluan: loan.keperluan,
            status: loan.status,
        }))

        return NextResponse.json({
            success: true,
            data: transformedData,
        })
    } catch (error) {
        console.error('Get active loans error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
