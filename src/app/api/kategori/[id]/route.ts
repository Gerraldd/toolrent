import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getPrisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getIpAddress } from '@/lib/utils'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/kategori/[id] - Get single kategori
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        const { id } = await params
        const kategoriId = parseInt(id)

        if (isNaN(kategoriId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid kategori ID' },
                { status: 400 }
            )
        }

        const kategori = await prisma.kategori.findUnique({
            where: { id: kategoriId },
            include: {
                _count: {
                    select: { alat: true },
                },
            },
        })

        if (!kategori) {
            return NextResponse.json(
                { success: false, error: 'Kategori tidak ditemukan' },
                { status: 404 }
            )
        }

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

// PUT /api/kategori/[id] - Update kategori
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        const { id } = await params
        const kategoriId = parseInt(id)

        if (isNaN(kategoriId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid kategori ID' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { nama, deskripsi } = body

        // Check if kategori exists
        const existingKategori = await prisma.kategori.findUnique({
            where: { id: kategoriId },
        })

        if (!existingKategori) {
            return NextResponse.json(
                { success: false, error: 'Kategori tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check if nama already used by another kategori
        if (nama && nama !== existingKategori.nama) {
            const namaExists = await prisma.kategori.findUnique({
                where: { nama },
            })
            if (namaExists) {
                return NextResponse.json(
                    { success: false, error: 'Nama kategori sudah digunakan' },
                    { status: 400 }
                )
            }
        }

        // Build update data
        const updateData: Record<string, unknown> = {}
        if (nama) updateData.nama = nama
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi

        const kategori = await prisma.kategori.update({
            where: { id: kategoriId },
            data: updateData,
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'UPDATE',
                tabel: 'kategori',
                recordId: kategori.id,
                deskripsi: `Mengupdate kategori: ${kategori.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Kategori berhasil diupdate',
            data: kategori,
        })
    } catch (error) {
        console.error('Error updating kategori:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/kategori/[id] - Delete kategori
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        const { id } = await params
        const kategoriId = parseInt(id)

        if (isNaN(kategoriId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid kategori ID' },
                { status: 400 }
            )
        }

        // Check if kategori exists
        const existingKategori = await prisma.kategori.findUnique({
            where: { id: kategoriId },
            include: {
                _count: {
                    select: { alat: true },
                },
            },
        })

        if (!existingKategori) {
            return NextResponse.json(
                { success: false, error: 'Kategori tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check if kategori has alat
        if (existingKategori._count.alat > 0) {
            return NextResponse.json(
                { success: false, error: `Tidak dapat menghapus kategori yang memiliki ${existingKategori._count.alat} alat` },
                { status: 400 }
            )
        }

        await prisma.kategori.delete({
            where: { id: kategoriId },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'DELETE',
                tabel: 'kategori',
                recordId: kategoriId,
                deskripsi: `Menghapus kategori: ${existingKategori.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Kategori berhasil dihapus',
        })
    } catch (error) {
        console.error('Error deleting kategori:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
