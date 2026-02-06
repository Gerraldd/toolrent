import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getPrisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getIpAddress } from '@/lib/utils'

interface ImportAlatData {
    kode?: string
    nama: string
    kategori?: string
    deskripsi?: string
    stokTotal?: number | string
    kondisi?: string
    status?: string
}

// Generate unique kode for alat
async function generateKode(): Promise<string> {
    const lastAlat = await prisma.alat.findFirst({
        orderBy: { id: 'desc' },
        select: { kode: true }
    })

    let nextNumber = 1
    if (lastAlat?.kode) {
        const match = lastAlat.kode.match(/\d+$/)
        if (match) {
            nextNumber = parseInt(match[0]) + 1
        }
    }

    return `ALT${nextNumber.toString().padStart(4, '0')}`
}

// POST /api/alat/import - Bulk import alat
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
        const invalidItems = data.filter((item: ImportAlatData) => !item.nama || item.nama.trim() === '')
        if (invalidItems.length > 0) {
            return NextResponse.json(
                { success: false, error: `${invalidItems.length} baris tidak memiliki nama alat` },
                { status: 400 }
            )
        }

        // Get existing alat names and kodes for duplicate detection
        const existingAlat = await prisma.alat.findMany({
            select: { nama: true, kode: true }
        })
        const existingNames = new Set(existingAlat.map(a => a.nama.toLowerCase()))
        const existingKodes = new Set(existingAlat.map(a => a.kode.toLowerCase()))

        // Get all kategori for mapping
        const kategoriList = await prisma.kategori.findMany({
            select: { id: true, nama: true }
        })
        const kategoriMap = new Map(kategoriList.map(k => [k.nama.toLowerCase(), k.id]))

        // Filter out duplicates and prepare data
        const newItems: {
            kode: string
            nama: string
            kategoriId: number | null
            deskripsi: string
            stokTotal: number
            stokTersedia: number
            kondisi: string
            status: string
        }[] = []
        const duplicates: string[] = []
        const seenNames = new Set<string>()
        const seenKodes = new Set<string>()

        let autoKodeCounter = 1
        const lastAlat = await prisma.alat.findFirst({
            orderBy: { id: 'desc' },
            select: { kode: true }
        })
        if (lastAlat?.kode) {
            const match = lastAlat.kode.match(/\d+$/)
            if (match) {
                autoKodeCounter = parseInt(match[0]) + 1
            }
        }

        for (const item of data as ImportAlatData[]) {
            const namaTrimmed = item.nama.trim()
            const namaLower = namaTrimmed.toLowerCase()

            // Check for duplicates
            if (existingNames.has(namaLower) || seenNames.has(namaLower)) {
                duplicates.push(namaTrimmed)
                continue
            }

            // Generate or use provided kode
            let kode = item.kode?.trim() || ''
            if (!kode || existingKodes.has(kode.toLowerCase()) || seenKodes.has(kode.toLowerCase())) {
                kode = `ALT${autoKodeCounter.toString().padStart(4, '0')}`
                autoKodeCounter++
            }

            // Find kategori by name
            let kategoriId: number | null = null
            if (item.kategori) {
                const kategoriLower = item.kategori.trim().toLowerCase()
                kategoriId = kategoriMap.get(kategoriLower) || null
            }

            // Parse stok
            let stokTotal = 1
            if (item.stokTotal !== undefined && item.stokTotal !== '') {
                const parsed = parseInt(String(item.stokTotal))
                if (!isNaN(parsed) && parsed > 0) {
                    stokTotal = parsed
                }
            }

            // Validate kondisi
            let kondisi = 'Baik'
            if (item.kondisi) {
                const kondisiLower = item.kondisi.trim().toLowerCase()
                if (kondisiLower === 'baik' || kondisiLower === 'good') kondisi = 'Baik'
                else if (kondisiLower === 'rusak' || kondisiLower === 'damaged') kondisi = 'Rusak'
                else if (kondisiLower === 'hilang' || kondisiLower === 'lost') kondisi = 'Hilang'
            }

            // Validate status
            let status = 'tersedia'
            if (item.status) {
                const statusLower = item.status.trim().toLowerCase()
                if (statusLower === 'tersedia' || statusLower === 'available') status = 'tersedia'
                else if (statusLower === 'habis' || statusLower === 'outofstock' || statusLower === 'out of stock') status = 'habis'
                else if (statusLower === 'maintenance' || statusLower === 'perbaikan') status = 'maintenance'
            }

            seenNames.add(namaLower)
            seenKodes.add(kode.toLowerCase())

            newItems.push({
                kode,
                nama: namaTrimmed,
                kategoriId,
                deskripsi: item.deskripsi?.trim() || '',
                stokTotal,
                stokTersedia: stokTotal,
                kondisi,
                status
            })
        }

        if (newItems.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Semua data sudah ada atau duplikat',
                duplicates
            }, { status: 400 })
        }

        // Create all alat in a transaction
        const created = await prisma.$transaction(
            newItems.map(item =>
                prisma.alat.create({
                    data: {
                        kode: item.kode,
                        nama: item.nama,
                        kategoriId: item.kategoriId,
                        deskripsi: item.deskripsi,
                        stokTotal: item.stokTotal,
                        stokTersedia: item.stokTersedia,
                        kondisi: item.kondisi,
                        status: item.status as 'tersedia' | 'habis' | 'maintenance'
                    }
                })
            )
        )

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(session.user.id),
                aksi: 'CREATE',
                tabel: 'alat',
                recordId: created[0]?.id || 0,
                deskripsi: `Import ${created.length} alat baru`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: `${created.length} alat berhasil diimport`,
            data: {
                imported: created.length,
                duplicates: duplicates.length,
                duplicateNames: duplicates.slice(0, 10)
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error importing alat:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
