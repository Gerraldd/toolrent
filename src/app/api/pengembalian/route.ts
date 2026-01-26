import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

// GET /api/pengembalian - List all pengembalian with pagination
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const kondisi = searchParams.get('kondisi') || ''

        const skip = (page - 1) * limit

        // Build where clause using AND array for proper combination
        const andConditions: Record<string, unknown>[] = []

        // If user is peminjam, filter to only show their returns
        if (auth.user.role === 'peminjam') {
            andConditions.push({ peminjaman: { userId: parseInt(auth.user.id) } })
        }

        if (search) {
            andConditions.push({
                OR: [
                    { peminjaman: { kode: { contains: search, mode: 'insensitive' } } },
                    { peminjaman: { user: { nama: { contains: search, mode: 'insensitive' } } } },
                    { peminjaman: { alat: { nama: { contains: search, mode: 'insensitive' } } } },
                ]
            })
        }

        if (kondisi && ['baik', 'rusak', 'hilang'].includes(kondisi)) {
            // Filter by per-unit condition counts instead of single kondisiAlat field
            if (kondisi === 'baik') {
                andConditions.push({ jumlahBaik: { gt: 0 } })
            } else if (kondisi === 'rusak') {
                andConditions.push({ jumlahRusak: { gt: 0 } })
            } else if (kondisi === 'hilang') {
                andConditions.push({ jumlahHilang: { gt: 0 } })
            }
        }

        const status = searchParams.get('status')
        if (status) {
            if (status === 'tepat_waktu') {
                andConditions.push({ hariTerlambat: 0 })
            } else if (status === 'terlambat') {
                andConditions.push({ hariTerlambat: { gt: 0 } })
            }
        }

        // Build final where clause
        const where = andConditions.length > 0 ? { AND: andConditions } : {}

        // Get total count
        const total = await prisma.pengembalian.count({ where })

        // Get pengembalian with relations
        const pengembalian = await prisma.pengembalian.findMany({
            where,
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
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        })

        // Transform data to match frontend interface
        const transformedData = pengembalian.map((item) => ({
            id: item.id,
            peminjaman: {
                id: item.peminjaman.id,
                kode: item.peminjaman.kode,
                tanggalPinjam: item.peminjaman.tanggalPinjam.toISOString().split('T')[0],
                tanggalKembaliRencana: item.peminjaman.tanggalKembaliRencana.toISOString().split('T')[0],
                jumlah: item.peminjaman.jumlah,
            },
            user: {
                nama: item.peminjaman.user.nama,
                email: item.peminjaman.user.email,
            },
            alat: {
                nama: item.peminjaman.alat.nama,
                kode: item.peminjaman.alat.kode,
            },
            tanggalKembali: item.tanggalKembaliAktual.toISOString().split('T')[0],
            kondisi: mapKondisiToSimple(item.kondisiAlat),
            jumlahBaik: item.jumlahBaik,
            jumlahRusak: item.jumlahRusak,
            jumlahHilang: item.jumlahHilang,
            denda: Number(item.totalDenda),
            hariTerlambat: item.hariTerlambat,
            keterangan: item.catatan || '',
            status: item.kondisiAlat === 'baik' ? 'selesai' : 'masalah',
            processor: item.processor,
        }))

        return NextResponse.json({
            success: true,
            data: transformedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        })
    } catch (error) {
        console.error('Get pengembalian error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/pengembalian - Create new pengembalian
export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        // All authenticated users can submit returns (peminjam for their own loans)

        const body = await request.json()
        const { peminjamanId, kondisi, keterangan, jumlahBaik, jumlahRusak, jumlahHilang } = body

        // Validate required fields
        if (!peminjamanId) {
            return NextResponse.json(
                { success: false, error: 'Peminjaman wajib diisi' },
                { status: 400 }
            )
        }

        // Check if peminjaman exists and is active
        const peminjaman = await prisma.peminjaman.findUnique({
            where: { id: parseInt(peminjamanId) },
            include: {
                alat: true,
                pengembalian: true,
            }
        })

        if (!peminjaman) {
            return NextResponse.json(
                { success: false, error: 'Peminjaman tidak ditemukan' },
                { status: 404 }
            )
        }

        // Peminjam can only return their own loans
        if (auth.user!.role === 'peminjam' && peminjaman.userId !== parseInt(auth.user!.id)) {
            return NextResponse.json(
                { success: false, error: 'Anda hanya dapat mengembalikan pinjaman milik Anda sendiri' },
                { status: 403 }
            )
        }

        if (peminjaman.status !== 'dipinjam' && peminjaman.status !== 'disetujui') {
            return NextResponse.json(
                { success: false, error: 'Peminjaman tidak dalam status yang dapat dikembalikan' },
                { status: 400 }
            )
        }

        if (peminjaman.pengembalian) {
            return NextResponse.json(
                { success: false, error: 'Peminjaman sudah memiliki data pengembalian' },
                { status: 400 }
            )
        }

        // Determine if using per-unit mode or legacy single condition mode
        const isPerUnitMode = jumlahBaik !== undefined || jumlahRusak !== undefined || jumlahHilang !== undefined

        let finalJumlahBaik = 0
        let finalJumlahRusak = 0
        let finalJumlahHilang = 0
        let kondisiAlat: 'baik' | 'rusak' | 'hilang'

        if (isPerUnitMode) {
            // Per-unit mode
            finalJumlahBaik = parseInt(jumlahBaik) || 0
            finalJumlahRusak = parseInt(jumlahRusak) || 0
            finalJumlahHilang = parseInt(jumlahHilang) || 0

            const totalReturned = finalJumlahBaik + finalJumlahRusak + finalJumlahHilang
            if (totalReturned !== peminjaman.jumlah) {
                return NextResponse.json(
                    { success: false, error: `Total unit yang dikembalikan (${totalReturned}) harus sama dengan jumlah yang dipinjam (${peminjaman.jumlah})` },
                    { status: 400 }
                )
            }

            // Determine kondisiAlat based on worst condition (priority: hilang > rusak > baik)
            if (finalJumlahHilang > 0) {
                kondisiAlat = 'hilang'
            } else if (finalJumlahRusak > 0) {
                kondisiAlat = 'rusak'
            } else {
                kondisiAlat = 'baik'
            }
        } else {
            // Legacy single condition mode
            if (!kondisi) {
                return NextResponse.json(
                    { success: false, error: 'Kondisi alat wajib diisi' },
                    { status: 400 }
                )
            }
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
            // In legacy mode, all units have the same condition
            if (kondisiAlat === 'baik') {
                finalJumlahBaik = peminjaman.jumlah
            } else if (kondisiAlat === 'rusak') {
                finalJumlahRusak = peminjaman.jumlah
            } else {
                finalJumlahHilang = peminjaman.jumlah
            }
        }

        // Calculate late days and fine
        const now = new Date()
        const indonesiaDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        const today = new Date(indonesiaDateString + 'T00:00:00.000Z')

        const tanggalKembaliRencana = new Date(peminjaman.tanggalKembaliRencana)
        const rencanaDateStr = tanggalKembaliRencana.toISOString().split('T')[0]
        const rencanaDate = new Date(rencanaDateStr + 'T00:00:00.000Z')

        const diffTime = today.getTime() - rencanaDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const hariTerlambat = diffDays > 0 ? diffDays : 0

        const DENDA_PER_HARI = 5000
        const totalDenda = hariTerlambat * DENDA_PER_HARI
        const ipAddress = getIpAddress(request)

        // Create pengembalian in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create pengembalian record with per-unit counts
            const pengembalian = await tx.pengembalian.create({
                data: {
                    peminjamanId: parseInt(peminjamanId),
                    tanggalKembaliAktual: today,
                    hariTerlambat,
                    dendaPerHari: DENDA_PER_HARI,
                    totalDenda: totalDenda,
                    kondisiAlat,
                    jumlahBaik: finalJumlahBaik,
                    jumlahRusak: finalJumlahRusak,
                    jumlahHilang: finalJumlahHilang,
                    catatan: keterangan || null,
                    processedBy: parseInt(auth.user!.id),
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

            // Update peminjaman status
            await tx.peminjaman.update({
                where: { id: parseInt(peminjamanId) },
                data: { status: 'dikembalikan' }
            })

            // Update alat stock based on per-unit conditions
            // - baik units are returned to available stock (stokTersedia)
            // - rusak units go to repair stock (stokPerbaikan)
            // - hilang units reduce total stock (stokTotal)
            const alatUpdateData: Record<string, unknown> = {
                stokTersedia: { increment: finalJumlahBaik },
                stokPerbaikan: { increment: finalJumlahRusak }
            }

            // If there are lost units, reduce total stock
            if (finalJumlahHilang > 0) {
                alatUpdateData.stokTotal = { decrement: finalJumlahHilang }
            }

            // Calculate new stock values for status determination
            const newStokTersedia = peminjaman.alat.stokTersedia + finalJumlahBaik
            const newStokTotal = peminjaman.alat.stokTotal - finalJumlahHilang
            const newStokPerbaikan = (peminjaman.alat.stokPerbaikan || 0) + finalJumlahRusak

            // Determine tool status based on stock levels
            if (newStokTotal <= 0) {
                alatUpdateData.status = 'habis'
            } else if (newStokTersedia <= 0 && newStokPerbaikan > 0) {
                // No available stock but items are in repair
                alatUpdateData.status = 'maintenance'
            } else if (newStokTersedia > 0) {
                alatUpdateData.status = 'tersedia'
            }

            await tx.alat.update({
                where: { id: peminjaman.alatId },
                data: alatUpdateData
            })

            // Log activity
            const logDesc = isPerUnitMode
                ? `Memproses pengembalian untuk peminjaman ${peminjaman.kode} (Baik: ${finalJumlahBaik}, Rusak: ${finalJumlahRusak}, Hilang: ${finalJumlahHilang})`
                : `Memproses pengembalian untuk peminjaman ${peminjaman.kode}`

            await tx.logAktivitas.create({
                data: {
                    userId: parseInt(auth.user!.id),
                    aksi: 'CREATE',
                    tabel: 'pengembalian',
                    recordId: pengembalian.id,
                    deskripsi: logDesc,
                    ipAddress
                }
            })

            return pengembalian
        })

        return NextResponse.json({
            success: true,
            message: 'Pengembalian berhasil diproses',
            data: result
        }, { status: 201 })

    } catch (error) {
        console.error('Create pengembalian error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal memproses pengembalian' },
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
