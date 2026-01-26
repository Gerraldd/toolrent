import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/pengembalian/[id] - Get single pengembalian
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const auth = await verifyAuth(request)
        const { id } = await params

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!hasRole(auth.user, ['admin', 'petugas'])) {
            return NextResponse.json(
                { success: false, error: 'Tidak memiliki akses' },
                { status: 403 }
            )
        }

        const pengembalianId = parseInt(id)

        const pengembalian = await prisma.pengembalian.findUnique({
            where: { id: pengembalianId },
            include: {
                peminjaman: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                nama: true,
                                email: true,
                            }
                        },
                        alat: {
                            select: {
                                id: true,
                                kode: true,
                                nama: true,
                            }
                        }
                    }
                },
                processor: {
                    select: {
                        id: true,
                        nama: true,
                    }
                }
            }
        })

        if (!pengembalian) {
            return NextResponse.json(
                { success: false, error: 'Data pengembalian tidak ditemukan' },
                { status: 404 }
            )
        }

        // Transform data
        const transformedData = {
            id: pengembalian.id,
            peminjaman: {
                id: pengembalian.peminjaman.id,
                kode: pengembalian.peminjaman.kode,
                tanggalPinjam: pengembalian.peminjaman.tanggalPinjam.toISOString().split('T')[0],
                tanggalKembaliRencana: pengembalian.peminjaman.tanggalKembaliRencana.toISOString().split('T')[0],
            },
            user: {
                nama: pengembalian.peminjaman.user.nama,
                email: pengembalian.peminjaman.user.email,
            },
            alat: {
                nama: pengembalian.peminjaman.alat.nama,
                kode: pengembalian.peminjaman.alat.kode,
            },
            tanggalKembali: pengembalian.tanggalKembaliAktual.toISOString().split('T')[0],
            kondisi: mapKondisiToSimple(pengembalian.kondisiAlat),
            denda: Number(pengembalian.totalDenda),
            hariTerlambat: pengembalian.hariTerlambat,
            keterangan: pengembalian.catatan || '',
            status: pengembalian.kondisiAlat === 'baik' ? 'selesai' : 'masalah',
            processor: pengembalian.processor,
        }

        return NextResponse.json({
            success: true,
            data: transformedData
        })
    } catch (error) {
        console.error('Get pengembalian detail error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/pengembalian/[id] - Update pengembalian
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const auth = await verifyAuth(request)
        const { id } = await params

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!hasRole(auth.user, ['admin', 'petugas'])) {
            return NextResponse.json(
                { success: false, error: 'Tidak memiliki akses untuk mengubah data' },
                { status: 403 }
            )
        }

        const pengembalianId = parseInt(id)
        const body = await request.json()
        const { kondisi, keterangan, dendaTambahan, denda, jumlahBaik, jumlahRusak, jumlahHilang } = body

        // Check if pengembalian exists
        const existing = await prisma.pengembalian.findUnique({
            where: { id: pengembalianId },
            include: {
                peminjaman: true,
            }
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Data pengembalian tidak ditemukan' },
                { status: 404 }
            )
        }

        // Validate kondisi if provided
        let kondisiAlat: 'baik' | 'rusak' | 'hilang' | undefined
        if (kondisi) {
            const kondisiMap: Record<string, 'baik' | 'rusak' | 'hilang'> = {
                'baik': 'baik',
                'rusak': 'rusak',
                'hilang': 'hilang',
            }
            kondisiAlat = kondisiMap[kondisi]
            if (!kondisiAlat) {
                return NextResponse.json(
                    { success: false, error: 'Kondisi alat tidak valid' },
                    { status: 400 }
                )
            }
        }

        // Calculate new total denda
        // Priority: direct denda value > dendaTambahan (additional fine)
        let newTotalDenda: number | undefined
        if (denda !== undefined) {
            // Direct update of denda value
            newTotalDenda = Number(denda)
        } else if (dendaTambahan !== undefined && dendaTambahan > 0) {
            // Add additional fine to existing
            newTotalDenda = Number(existing.totalDenda) + Number(dendaTambahan)
        }

        // Update pengembalian
        const updated = await prisma.pengembalian.update({
            where: { id: pengembalianId },
            data: {
                ...(kondisiAlat && { kondisiAlat }),
                ...(keterangan !== undefined && { catatan: keterangan }),
                ...(newTotalDenda !== undefined && { totalDenda: newTotalDenda }),
                ...(jumlahBaik !== undefined && { jumlahBaik: Number(jumlahBaik) }),
                ...(jumlahRusak !== undefined && { jumlahRusak: Number(jumlahRusak) }),
                ...(jumlahHilang !== undefined && { jumlahHilang: Number(jumlahHilang) }),
            },
            include: {
                peminjaman: {
                    include: {
                        user: { select: { nama: true, email: true } },
                        alat: { select: { kode: true, nama: true } },
                    }
                },
                processor: { select: { nama: true } },
            }
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(auth.user.id),
                aksi: 'UPDATE',
                tabel: 'pengembalian',
                recordId: pengembalianId,
                deskripsi: `Mengubah data pengembalian untuk peminjaman ${existing.peminjaman.kode}`,
                ipAddress: getIpAddress(request)
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Data pengembalian berhasil diperbarui',
            data: updated
        })
    } catch (error) {
        console.error('Update pengembalian error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal mengubah data pengembalian' },
            { status: 500 }
        )
    }
}

// DELETE /api/pengembalian/[id] - Delete pengembalian
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const auth = await verifyAuth(request)
        const { id } = await params

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!hasRole(auth.user, 'admin')) {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menghapus data pengembalian' },
                { status: 403 }
            )
        }

        const pengembalianId = parseInt(id)

        // Check if pengembalian exists
        const existing = await prisma.pengembalian.findUnique({
            where: { id: pengembalianId },
            include: {
                peminjaman: {
                    include: { alat: true }
                },
            }
        })

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Data pengembalian tidak ditemukan' },
                { status: 404 }
            )
        }

        // Delete in transaction and revert peminjaman status
        const ipAddress = getIpAddress(request)
        await prisma.$transaction(async (tx) => {
            // Delete pengembalian
            await tx.pengembalian.delete({
                where: { id: pengembalianId }
            })

            // Revert peminjaman status back to dipinjam
            await tx.peminjaman.update({
                where: { id: existing.peminjamanId },
                data: { status: 'dipinjam' }
            })

            // Decrement alat stock (since it was returned)
            await tx.alat.update({
                where: { id: existing.peminjaman.alatId },
                data: {
                    stokTersedia: { decrement: existing.peminjaman.jumlah }
                }
            })

            // Log activity
            await tx.logAktivitas.create({
                data: {
                    userId: parseInt(auth.user!.id),
                    aksi: 'DELETE',
                    tabel: 'pengembalian',
                    recordId: pengembalianId,
                    deskripsi: `Menghapus data pengembalian untuk peminjaman ${existing.peminjaman.kode}`,
                    ipAddress
                }
            })
        })

        return NextResponse.json({
            success: true,
            message: 'Data pengembalian berhasil dihapus'
        })
    } catch (error) {
        console.error('Delete pengembalian error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal menghapus data pengembalian' },
            { status: 500 }
        )
    }
}

// Helper function to map kondisi from enum to simple string
function mapKondisiToSimple(kondisi: string): 'baik' | 'rusak' | 'hilang' {
    if (kondisi === 'baik') return 'baik'
    if (kondisi === 'hilang') return 'hilang'
    return 'rusak' // rusak_ringan or rusak_berat
}
