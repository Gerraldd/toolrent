'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

export async function DELETE(request: NextRequest) {
    try {
        // Verify authentication
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!hasRole(auth.user, ['admin'])) {
            return NextResponse.json(
                { success: false, error: 'Tidak memiliki akses untuk menghapus data' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'IDs array is required' },
                { status: 400 }
            )
        }

        // Delete all peminjaman with the given IDs
        const result = await prisma.peminjaman.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        })

        // Log activity for bulk delete
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(auth.user.id),
                aksi: 'DELETE',
                tabel: 'peminjaman',
                recordId: null,
                deskripsi: `Menghapus ${result.count} data peminjaman secara massal`,
                ipAddress: getIpAddress(request)
            }
        })

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${result.count} records`,
            deletedCount: result.count
        })
    } catch (error) {
        console.error('Error in bulk delete peminjaman:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete records' },
            { status: 500 }
        )
    }
}
