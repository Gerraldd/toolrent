import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'

// GET /api/log-aktivitas - List all logs with pagination
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        if (!hasRole(auth.user, 'admin')) {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengakses log aktivitas' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const aksi = searchParams.get('aksi') || ''

        const skip = (page - 1) * limit

        // Build where clause
        const where: Record<string, unknown> = {}

        if (search) {
            where.OR = [
                { deskripsi: { contains: search, mode: 'insensitive' } },
                { user: { nama: { contains: search, mode: 'insensitive' } } },
                { tabel: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (aksi) {
            where.aksi = aksi
        }

        // Get logs with pagination
        const [logs, total] = await Promise.all([
            prisma.logAktivitas.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            nama: true,
                            email: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.logAktivitas.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching logs:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/log-aktivitas - Delete logs (bulk or single)
export async function DELETE(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        if (!hasRole(auth.user, 'admin')) {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menghapus log aktivitas' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Daftar ID log tidak valid' },
                { status: 400 }
            )
        }

        await prisma.logAktivitas.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: `${ids.length} log berhasil dihapus`,
        })

    } catch (error) {
        console.error('Error deleting logs:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
