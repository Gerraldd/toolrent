import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth-api'
import { generatePeminjamanPDF, generatePengembalianPDF, generateDendaPDF } from '@/lib/pdf-generator'
import { generatePeminjamanExcel, generatePengembalianExcel, generateDendaExcel } from '@/lib/excel-generator'

// GET /api/laporan - Generate report and return as file
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin and petugas can access reports
        if (!['admin', 'petugas'].includes(auth.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // peminjaman, pengembalian, denda
        const format = searchParams.get('format') // pdf, excel
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const kategori = searchParams.get('kategori')

        // Only type and format are required, dates are optional
        if (!type || !format) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: type, format' },
                { status: 400 }
            )
        }

        // Build date filter only if dates are provided
        let dateFilter: { gte?: Date, lte?: Date } | undefined
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999) // Include the entire end date
            dateFilter = { gte: start, lte: end }
        } else if (startDate) {
            dateFilter = { gte: new Date(startDate) }
        } else if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            dateFilter = { lte: end }
        }

        let data: any[] = []

        if (type === 'peminjaman') {
            const where: any = {}
            if (dateFilter) {
                where.createdAt = dateFilter
            }
            if (kategori && kategori !== 'all') {
                where.alat = { kategori: { nama: { equals: kategori, mode: 'insensitive' } } }
            }

            data = await prisma.peminjaman.findMany({
                where,
                include: {
                    user: { select: { nama: true, email: true } },
                    alat: {
                        select: {
                            kode: true,
                            nama: true,
                            kategori: { select: { nama: true } }
                        }
                    },
                },
                orderBy: { createdAt: 'desc' }
            })
        } else if (type === 'pengembalian') {
            const where: any = {}
            if (dateFilter) {
                where.createdAt = dateFilter
            }
            // Filter by category through peminjaman.alat relation (Pengembalian -> Peminjaman -> Alat -> Kategori)
            if (kategori && kategori !== 'all') {
                where.peminjaman = { alat: { kategori: { nama: { equals: kategori, mode: 'insensitive' } } } }
            }

            data = await prisma.pengembalian.findMany({
                where,
                include: {
                    peminjaman: {
                        include: {
                            user: { select: { nama: true, email: true } },
                            alat: {
                                select: {
                                    kode: true,
                                    nama: true,
                                    kategori: { select: { nama: true } }
                                }
                            },
                        }
                    },
                    processor: { select: { nama: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        } else if (type === 'denda') {
            // Get pengembalian with late days > 0
            const where: any = {
                hariTerlambat: { gt: 0 }
            }
            if (dateFilter) {
                where.createdAt = dateFilter
            }
            // Filter by category through peminjaman.alat relation (Pengembalian -> Peminjaman -> Alat -> Kategori)
            if (kategori && kategori !== 'all') {
                where.peminjaman = { alat: { kategori: { nama: { equals: kategori, mode: 'insensitive' } } } }
            }

            data = await prisma.pengembalian.findMany({
                where,
                include: {
                    peminjaman: {
                        include: {
                            user: { select: { nama: true, email: true } },
                            alat: {
                                select: {
                                    kode: true,
                                    nama: true,
                                    kategori: { select: { nama: true } }
                                }
                            },
                        }
                    },
                    processor: { select: { nama: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid report type' },
                { status: 400 }
            )
        }

        const dateRange = {
            start: startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Semua Waktu',
            end: endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Semua Waktu',
            kategori: (!kategori || kategori === 'all') ? 'Semua Kategori' : kategori
        }

        if (format === 'pdf') {
            let pdfBuffer: Uint8Array

            if (type === 'peminjaman') {
                pdfBuffer = await generatePeminjamanPDF(data, dateRange)
            } else if (type === 'pengembalian') {
                pdfBuffer = await generatePengembalianPDF(data, dateRange)
            } else {
                pdfBuffer = await generateDendaPDF(data, dateRange)
            }

            const dateRangeStr = startDate && endDate ? `${startDate}_${endDate}` : 'Semua_Periode'

            return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename=Laporan_${type}_${dateRangeStr}.pdf`
                }
            })
        } else if (format === 'excel') {
            let excelBuffer: Uint8Array

            if (type === 'peminjaman') {
                excelBuffer = await generatePeminjamanExcel(data, dateRange)
            } else if (type === 'pengembalian') {
                excelBuffer = await generatePengembalianExcel(data, dateRange)
            } else {
                excelBuffer = await generateDendaExcel(data, dateRange)
            }

            const dateRangeStr = startDate && endDate ? `${startDate}_${endDate}` : 'Semua_Periode'

            return new NextResponse(excelBuffer.buffer as ArrayBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename=Laporan_${type}_${dateRangeStr}.xlsx`
                }
            })
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid format. Use pdf or excel' },
                { status: 400 }
            )
        }

    } catch (error) {
        console.error('Generate report error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal generate laporan' },
            { status: 500 }
        )
    }
}
