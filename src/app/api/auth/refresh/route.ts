import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// Token expiry configurations (in seconds)
const ACCESS_TOKEN_EXPIRY = 15 * 60 // 15 minutes

interface RefreshTokenPayload {
    id: string
    type: string
    iat: number
    exp: number
}

// POST /api/auth/refresh - Refresh access token using refresh token
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { refreshToken } = body

        if (!refreshToken) {
            return NextResponse.json({
                success: false,
                error: 'Refresh token diperlukan'
            }, { status: 400 })
        }

        const secret = process.env.NEXTAUTH_SECRET || 'default-secret'

        // Verify refresh token
        let decoded: RefreshTokenPayload
        try {
            decoded = jwt.verify(refreshToken, secret) as RefreshTokenPayload
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                return NextResponse.json({
                    success: false,
                    error: 'Refresh token telah kadaluarsa, silakan login ulang'
                }, { status: 401 })
            }
            return NextResponse.json({
                success: false,
                error: 'Refresh token tidak valid'
            }, { status: 401 })
        }

        // Check if it's actually a refresh token
        if (decoded.type !== 'refresh') {
            return NextResponse.json({
                success: false,
                error: 'Token yang diberikan bukan refresh token'
            }, { status: 400 })
        }

        // Find user
        const userId = parseInt(decoded.id)
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User tidak ditemukan'
            }, { status: 404 })
        }

        if (user.status === 'nonaktif') {
            return NextResponse.json({
                success: false,
                error: 'Akun telah dinonaktifkan'
            }, { status: 403 })
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            {
                id: String(user.id),
                nama: user.nama,
                email: user.email,
                role: user.role,
                type: 'access'
            },
            secret,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        )

        return NextResponse.json({
            success: true,
            message: 'Access token berhasil diperbarui',
            data: {
                accessToken: newAccessToken,
                accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
                tokenType: 'Bearer'
            }
        })

    } catch (error) {
        console.error('Refresh token error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}
