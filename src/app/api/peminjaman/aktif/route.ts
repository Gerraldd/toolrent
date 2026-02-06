import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'

// GET /api/peminjaman/aktif - Get active loans (for return dropdown)
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        if (!hasRole(auth.user, ['admin', 'petugas'])) {
            return NextResponse.json(
                { success: false, error: 'Tidak memiliki akses' },
                { status: 403 }
            )
        }

        // Get peminjaman that are active (dipinjam or disetujui) and don't have pengembalian yet
        const peminjamanAktif = await prisma.peminjaman.findMany({
            where: {
                status: {
                    in: ['dipinjam', 'disetujui']
                },
                pengembalian: null, // No pengembalian record yet
            },
            include: {
                user: {
                    select: {
                        id: true,
                        nama: true,
                    }
                },
                alat: {
                    select: {
                        id: true,
                        kode: true,
                        nama: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        // Transform to match frontend interface
        const transformedData = peminjamanAktif.map((p) => ({
            id: p.id,
            kode: p.kode,
            jumlah: p.jumlah,
            tanggalPinjam: p.tanggalPinjam.toISOString().split('T')[0],
            tanggalKembaliRencana: p.tanggalKembaliRencana.toISOString().split('T')[0],
            user: { nama: p.user.nama },
            alat: { nama: p.alat.nama },
        }))

        return NextResponse.json({
            success: true,
            data: transformedData,
        })
    } catch (error) {
        console.error('Get active peminjaman error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
