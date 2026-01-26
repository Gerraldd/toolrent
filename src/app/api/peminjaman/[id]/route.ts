import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getIpAddress } from '@/lib/utils'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/peminjaman/[id] - Get peminjaman by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const peminjaman = await prisma.peminjaman.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    select: {
                        id: true,
                        nama: true,
                        email: true,
                        noTelepon: true,
                        alamat: true,
                    }
                },
                alat: {
                    select: {
                        id: true,
                        kode: true,
                        nama: true,
                        gambar: true,
                        kategori: true,
                    }
                },
                validator: {
                    select: { id: true, nama: true }
                },
                pengembalian: true,
            }
        })

        if (!peminjaman) {
            return NextResponse.json(
                { success: false, error: 'Peminjaman tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check access - user can only view their own, admin/petugas can view all
        if (session.user.role === 'peminjam' && peminjaman.userId !== parseInt(session.user.id)) {
            return NextResponse.json(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        return NextResponse.json({
            success: true,
            data: peminjaman
        })
    } catch (error) {
        console.error('Get peminjaman error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/peminjaman/[id] - Update peminjaman (approve/reject/etc)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { status, catatanValidasi, userId, alatId, jumlah, tanggalPinjam, tanggalKembaliRencana, keperluan } = body

        const peminjaman = await prisma.peminjaman.findUnique({
            where: { id: parseInt(id) },
            include: { alat: true }
        })

        if (!peminjaman) {
            return NextResponse.json(
                { success: false, error: 'Peminjaman tidak ditemukan' },
                { status: 404 }
            )
        }

        const updateData: Record<string, unknown> = {}

        // Handle basic field updates
        if (userId) updateData.userId = userId
        if (alatId) updateData.alatId = alatId
        if (jumlah) updateData.jumlah = jumlah
        if (tanggalPinjam) updateData.tanggalPinjam = new Date(tanggalPinjam)
        if (tanggalKembaliRencana) updateData.tanggalKembaliRencana = new Date(tanggalKembaliRencana)
        if (keperluan) updateData.keperluan = keperluan

        // Handle status change
        if (status) {
            updateData.status = status

            // If approved, check and update stock
            if (status === 'disetujui' || status === 'dipinjam') {
                if (peminjaman.status === 'menunggu') {
                    // Check stock availability (only if alatId hasn't changed or if it changed to a new tool)
                    // For simplicity, if alatId changed, we check the NEW tool's stock. 
                    const targetAlatId = alatId || peminjaman.alatId
                    const targetJumlah = jumlah || peminjaman.jumlah

                    const alat = await prisma.alat.findUnique({ where: { id: targetAlatId } })

                    if (!alat || alat.stokTersedia < targetJumlah) {
                        return NextResponse.json(
                            { success: false, error: 'Stok tidak mencukupi' },
                            { status: 400 }
                        )
                    }

                    // Reduce stock
                    await prisma.alat.update({
                        where: { id: targetAlatId },
                        data: {
                            stokTersedia: { decrement: targetJumlah }
                        }
                    })
                }

                updateData.validatedBy = parseInt(session.user.id)
                updateData.validatedAt = new Date()
            }

            // If rejected, just update status
            if (status === 'ditolak') {
                updateData.validatedBy = parseInt(session.user.id)
                updateData.validatedAt = new Date()
            }
        }

        if (catatanValidasi !== undefined) {
            updateData.catatanValidasi = catatanValidasi
        }

        const updated = await prisma.peminjaman.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                user: { select: { id: true, nama: true, email: true } },
                alat: { select: { id: true, kode: true, nama: true } },
                validator: { select: { id: true, nama: true } },
            }
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'UPDATE',
                tabel: 'peminjaman',
                recordId: updated.id,
                deskripsi: `Update peminjaman ${updated.kode} - Status: ${status || 'no change'}`,
                ipAddress: getIpAddress(request)
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Peminjaman berhasil diupdate',
            data: updated
        })
    } catch (error) {
        console.error('Update peminjaman error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal mengupdate peminjaman' },
            { status: 500 }
        )
    }
}

// DELETE /api/peminjaman/[id] - Delete peminjaman
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        const { id } = await params

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Admin only' },
                { status: 401 }
            )
        }

        const peminjaman = await prisma.peminjaman.findUnique({
            where: { id: parseInt(id) },
            include: { alat: true }
        })

        if (!peminjaman) {
            return NextResponse.json(
                { success: false, error: 'Peminjaman tidak ditemukan' },
                { status: 404 }
            )
        }

        // If peminjaman was approved/borrowed, restore stock
        if (['disetujui', 'dipinjam'].includes(peminjaman.status)) {
            await prisma.alat.update({
                where: { id: peminjaman.alatId },
                data: {
                    stokTersedia: { increment: peminjaman.jumlah }
                }
            })
        }

        await prisma.peminjaman.delete({
            where: { id: parseInt(id) }
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'DELETE',
                tabel: 'peminjaman',
                recordId: parseInt(id),
                deskripsi: `Hapus peminjaman ${peminjaman.kode}`,
                ipAddress: getIpAddress(request)
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Peminjaman berhasil dihapus'
        })
    } catch (error) {
        console.error('Delete peminjaman error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal menghapus peminjaman' },
            { status: 500 }
        )
    }
}
