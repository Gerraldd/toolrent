import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

// POST /api/auth/logout - Logout endpoint
export async function POST(request: NextRequest) {
    try {
        // Verify the current token
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json({
                success: false,
                error: auth.error || 'Unauthorized - No valid token provided'
            }, { status: 401 })
        }

        const userId = parseInt(auth.user.id)

        // Log logout activity
        await prisma.logAktivitas.create({
            data: {
                userId: userId,
                aksi: 'LOGOUT',
                tabel: 'users',
                recordId: userId,
                deskripsi: `${auth.user.nama} berhasil logout`,
                ipAddress: getIpAddress(request)
            }
        })

        // Note: Since JWT tokens are stateless, we can't really "invalidate" them server-side
        // without implementing a token blacklist. The client should discard the tokens.
        // For a production app, you might want to implement a token blacklist in Redis.

        return NextResponse.json({
            success: true,
            message: 'Logout berhasil. Silakan hapus token di client.'
        })

    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
