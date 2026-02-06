import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getPrisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getIpAddress } from '@/lib/utils'

// GET /api/alat - List all alat with pagination
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

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const kategoriId = searchParams.get('kategoriId') || ''
        const status = searchParams.get('status') || ''

        const skip = (page - 1) * limit

        // Build where clause
        const where: Record<string, unknown> = {}

        if (search) {
            where.OR = [
                { nama: { contains: search, mode: 'insensitive' } },
                { kode: { contains: search, mode: 'insensitive' } },
                { deskripsi: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (kategoriId && !isNaN(parseInt(kategoriId))) {
            where.kategoriId = parseInt(kategoriId)
        }

        if (status && ['tersedia', 'habis', 'maintenance'].includes(status)) {
            where.status = status
        }

        // Get alat with pagination
        const [alat, total] = await Promise.all([
            prisma.alat.findMany({
                where,
                include: {
                    kategori: {
                        select: {
                            id: true,
                            nama: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.alat.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: alat,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching alat:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/alat - Create new alat
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        const body = await request.json()
        const { kode, nama, kategoriId, deskripsi, gambar, stokTotal, kondisi, status } = body

        // Validation
        if (!kode || !nama) {
            return NextResponse.json(
                { success: false, error: 'Kode dan nama wajib diisi' },
                { status: 400 }
            )
        }

        // Check if kode already exists
        const existingAlat = await prisma.alat.findUnique({
            where: { kode },
        })

        if (existingAlat) {
            return NextResponse.json(
                { success: false, error: 'Kode alat sudah terdaftar' },
                { status: 400 }
            )
        }

        // Create alat
        const alat = await prisma.alat.create({
            data: {
                kode,
                nama,
                kategoriId: kategoriId || null,
                deskripsi,
                gambar,
                stokTotal: stokTotal || 1,
                stokTersedia: stokTotal || 1,
                kondisi: kondisi || 'Baik',
                status: status || 'tersedia',
            },
            include: {
                kategori: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
            },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'CREATE',
                tabel: 'alat',
                recordId: alat.id,
                deskripsi: `Membuat alat baru: ${alat.nama} (${alat.kode})`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Alat berhasil dibuat',
            data: alat,
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating alat:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
