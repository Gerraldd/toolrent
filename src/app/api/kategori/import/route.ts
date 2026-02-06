import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getPrisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getIpAddress } from '@/lib/utils'

// POST /api/kategori/import - Bulk import kategori
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { data } = body

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Data import tidak valid' },
                { status: 400 }
            )
        }

        // Validate all items have nama
        const invalidItems = data.filter((item: { nama?: string }) => !item.nama || item.nama.trim() === '')
        if (invalidItems.length > 0) {
            return NextResponse.json(
                { success: false, error: `${invalidItems.length} baris tidak memiliki nama kategori` },
                { status: 400 }
            )
        }

        // Get existing kategori names for duplicate detection
        const existingKategori = await prisma.kategori.findMany({
            select: { nama: true }
        })
        const existingNames = new Set(existingKategori.map(k => k.nama.toLowerCase()))

        // Filter out duplicates and prepare data
        const newItems: { nama: string; deskripsi: string }[] = []
        const duplicates: string[] = []
        const seenNames = new Set<string>()

        for (const item of data as { nama: string; deskripsi?: string }[]) {
            const namaTrimmed = item.nama.trim()
            const namaLower = namaTrimmed.toLowerCase()

            if (existingNames.has(namaLower) || seenNames.has(namaLower)) {
                duplicates.push(namaTrimmed)
            } else {
                seenNames.add(namaLower)
                newItems.push({
                    nama: namaTrimmed,
                    deskripsi: item.deskripsi?.trim() || ''
                })
            }
        }

        if (newItems.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Semua data sudah ada atau duplikat',
                duplicates
            }, { status: 400 })
        }

        // Create all kategori in a transaction
        const created = await prisma.$transaction(
            newItems.map(item =>
                prisma.kategori.create({
                    data: {
                        nama: item.nama,
                        deskripsi: item.deskripsi
                    }
                })
            )
        )

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'CREATE',
                tabel: 'kategori',
                recordId: created[0]?.id || 0,
                deskripsi: `Import ${created.length} kategori baru`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: `${created.length} kategori berhasil diimport`,
            data: {
                imported: created.length,
                duplicates: duplicates.length,
                duplicateNames: duplicates.slice(0, 10) // Show max 10 duplicate names
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error importing kategori:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
