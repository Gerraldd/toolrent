import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getIpAddress } from '@/lib/utils'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/alat/[id] - Get single alat
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const alatId = parseInt(id)

        if (isNaN(alatId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid alat ID' },
                { status: 400 }
            )
        }

        const alat = await prisma.alat.findUnique({
            where: { id: alatId },
            include: {
                kategori: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
            },
        })

        if (!alat) {
            return NextResponse.json(
                { success: false, error: 'Alat tidak ditemukan' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: alat,
        })
    } catch (error) {
        console.error('Error fetching alat:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/alat/[id] - Update alat
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const alatId = parseInt(id)

        if (isNaN(alatId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid alat ID' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { kode, nama, kategoriId, deskripsi, gambar, stokTotal, stokTersedia, stokPerbaikan, kondisi, status } = body

        // Check if alat exists
        const existingAlat = await prisma.alat.findUnique({
            where: { id: alatId },
        })

        if (!existingAlat) {
            return NextResponse.json(
                { success: false, error: 'Alat tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check if kode already used by another alat
        if (kode && kode !== existingAlat.kode) {
            const kodeExists = await prisma.alat.findUnique({
                where: { kode },
            })
            if (kodeExists) {
                return NextResponse.json(
                    { success: false, error: 'Kode alat sudah digunakan' },
                    { status: 400 }
                )
            }
        }

        // Build update data
        const updateData: Record<string, unknown> = {}
        if (kode) updateData.kode = kode
        if (nama) updateData.nama = nama
        if (kategoriId !== undefined) updateData.kategoriId = kategoriId || null
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi
        if (gambar !== undefined) updateData.gambar = gambar
        if (stokTotal !== undefined) updateData.stokTotal = stokTotal
        if (stokTersedia !== undefined) updateData.stokTersedia = stokTersedia
        if (stokPerbaikan !== undefined) updateData.stokPerbaikan = stokPerbaikan
        if (kondisi !== undefined) updateData.kondisi = kondisi
        if (status) updateData.status = status

        // Automatic status update based on stock
        const finalStokTersedia = stokTersedia !== undefined ? stokTersedia : existingAlat.stokTersedia
        const finalStokPerbaikan = stokPerbaikan !== undefined ? stokPerbaikan : (existingAlat.stokPerbaikan || 0)

        if (finalStokTersedia === 0) {
            if (finalStokPerbaikan > 0) {
                updateData.status = 'maintenance'
            } else {
                updateData.status = 'habis'
            }
        } else if (finalStokTersedia > 0) {
            updateData.status = 'tersedia'
        }

        const alat = await prisma.alat.update({
            where: { id: alatId },
            data: updateData,
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
                aksi: 'UPDATE',
                tabel: 'alat',
                recordId: alat.id,
                deskripsi: `Mengupdate alat: ${alat.nama} (${alat.kode})`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Alat berhasil diupdate',
            data: alat,
        })
    } catch (error) {
        console.error('Error updating alat:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/alat/[id] - Delete alat
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const alatId = parseInt(id)

        if (isNaN(alatId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid alat ID' },
                { status: 400 }
            )
        }

        // Check if alat exists
        const existingAlat = await prisma.alat.findUnique({
            where: { id: alatId },
        })

        if (!existingAlat) {
            return NextResponse.json(
                { success: false, error: 'Alat tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check if alat has active peminjaman
        const activePeminjaman = await prisma.peminjaman.findFirst({
            where: {
                alatId,
                status: {
                    in: ['menunggu', 'disetujui', 'dipinjam'],
                },
            },
        })

        if (activePeminjaman) {
            return NextResponse.json(
                { success: false, error: 'Tidak dapat menghapus alat yang sedang dipinjam' },
                { status: 400 }
            )
        }

        await prisma.alat.delete({
            where: { id: alatId },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'DELETE',
                tabel: 'alat',
                recordId: alatId,
                deskripsi: `Menghapus alat: ${existingAlat.nama} (${existingAlat.kode})`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Alat berhasil dihapus',
        })
    } catch (error) {
        console.error('Error deleting alat:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
