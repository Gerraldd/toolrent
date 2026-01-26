import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getIpAddress } from '@/lib/utils'

// GET /api/peminjaman - Get all peminjaman
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''
        let userIdFilter = searchParams.get('userId') || ''

        // If user is peminjam, force filter by their own userId
        if (session.user.role === 'peminjam') {
            userIdFilter = session.user.id
        }

        const skip = (page - 1) * limit

        // Build where clause
        const where: Record<string, unknown> = {}

        if (search) {
            where.OR = [
                { kode: { contains: search, mode: 'insensitive' } },
                { user: { nama: { contains: search, mode: 'insensitive' } } },
                { alat: { nama: { contains: search, mode: 'insensitive' } } },
            ]
        }

        if (status) {
            where.status = status
        }

        if (userIdFilter) {
            where.userId = parseInt(userIdFilter)
        }

        // Get total count
        const total = await prisma.peminjaman.count({ where })

        // Get peminjaman with relations
        const peminjaman = await prisma.peminjaman.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        nama: true,
                        email: true,
                        noTelepon: true,
                    }
                },
                alat: {
                    select: {
                        id: true,
                        kode: true,
                        nama: true,
                        gambar: true,
                        stokTersedia: true,
                    }
                },
                validator: {
                    select: {
                        id: true,
                        nama: true,
                    }
                },
                pengembalian: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        })

        return NextResponse.json({
            success: true,
            data: peminjaman,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        })
    } catch (error) {
        console.error('Get peminjaman error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/peminjaman - Create new peminjaman
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { userId, alatId, jumlah, tanggalPinjam, tanggalKembaliRencana, keperluan } = body

        // Validate required fields
        if (!alatId || !tanggalPinjam || !tanggalKembaliRencana || !keperluan) {
            return NextResponse.json(
                { success: false, error: 'Data peminjaman tidak lengkap' },
                { status: 400 }
            )
        }

        // Determine user ID - if admin/petugas can create for other users
        const peminjamId = ['admin', 'petugas'].includes(session.user.role) && userId
            ? parseInt(userId)
            : parseInt(session.user.id)

        // Check alat availability
        const alat = await prisma.alat.findUnique({
            where: { id: parseInt(alatId) }
        })

        if (!alat) {
            return NextResponse.json(
                { success: false, error: 'Alat tidak ditemukan' },
                { status: 404 }
            )
        }

        const borrowAmount = jumlah || 1

        if (alat.stokTersedia < borrowAmount) {
            return NextResponse.json(
                { success: false, error: `Stok tidak mencukupi. Tersedia: ${alat.stokTersedia}` },
                { status: 400 }
            )
        }

        // Generate unique kode
        const today = new Date()
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
        const count = await prisma.peminjaman.count({
            where: {
                kode: { startsWith: `PJM-${dateStr}` }
            }
        })
        const kode = `PJM-${dateStr}-${String(count + 1).padStart(3, '0')}`

        // Create peminjaman
        const peminjaman = await prisma.peminjaman.create({
            data: {
                kode,
                userId: peminjamId,
                alatId: parseInt(alatId),
                jumlah: borrowAmount,
                tanggalPinjam: new Date(tanggalPinjam),
                tanggalKembaliRencana: new Date(tanggalKembaliRencana),
                keperluan,
                status: 'menunggu',
            },
            include: {
                user: {
                    select: { id: true, nama: true, email: true }
                },
                alat: {
                    select: { id: true, kode: true, nama: true }
                },
            }
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'CREATE',
                tabel: 'peminjaman',
                recordId: peminjaman.id,
                deskripsi: `Pengajuan peminjaman ${kode} untuk alat ${alat.nama}`,
                ipAddress: getIpAddress(request)
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Peminjaman berhasil diajukan',
            data: peminjaman
        }, { status: 201 })

    } catch (error) {
        console.error('Create peminjaman error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal membuat peminjaman' },
            { status: 500 }
        )
    }
}
