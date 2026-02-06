import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getPrisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getIpAddress } from '@/lib/utils'

// GET /api/kategori - List all kategori
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
        const search = searchParams.get('search') || ''

        // Build where clause
        const where: Record<string, unknown> = {}

        if (search) {
            where.OR = [
                { nama: { contains: search, mode: 'insensitive' } },
                { deskripsi: { contains: search, mode: 'insensitive' } },
            ]
        }

        const kategori = await prisma.kategori.findMany({
            where,
            include: {
                _count: {
                    select: { alat: true },
                },
            },
            orderBy: { nama: 'asc' },
        })

        return NextResponse.json({
            success: true,
            data: kategori,
        })
    } catch (error) {
        console.error('Error fetching kategori:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/kategori - Create new kategori
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
        const { nama, deskripsi } = body

        // Validation
        if (!nama) {
            return NextResponse.json(
                { success: false, error: 'Nama kategori wajib diisi' },
                { status: 400 }
            )
        }

        // Check if nama already exists
        const existingKategori = await prisma.kategori.findUnique({
            where: { nama },
        })

        if (existingKategori) {
            return NextResponse.json(
                { success: false, error: 'Nama kategori sudah terdaftar' },
                { status: 400 }
            )
        }

        // Create kategori
        const kategori = await prisma.kategori.create({
            data: {
                nama,
                deskripsi,
            },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'CREATE',
                tabel: 'kategori',
                recordId: kategori.id,
                deskripsi: `Membuat kategori baru: ${kategori.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Kategori berhasil dibuat',
            data: kategori,
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating kategori:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
