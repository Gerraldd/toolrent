import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getIpAddress } from '@/lib/utils'
import jwt from 'jsonwebtoken'

// Token expiry configurations (in seconds)
const ACCESS_TOKEN_EXPIRY = 15 * 60 // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 // 7 days

// Helper function to generate JWT tokens
function generateTokens(user: { id: number; nama: string; email: string; role: string }) {
    const secret = process.env.NEXTAUTH_SECRET || 'default-secret'

    const accessToken = jwt.sign(
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

    const refreshToken = jwt.sign(
        {
            id: String(user.id),
            type: 'refresh'
        },
        secret,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    )

    return {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
        refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRY
    }
}

// POST /api/auth/login - Login endpoint with JWT tokens for API testing
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password } = body

        // Validation
        if (!email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Email dan password wajib diisi'
            }, { status: 400 })
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Email atau password salah'
            }, { status: 401 })
        }

        // Check if user is active
        if (user.status === 'nonaktif') {
            return NextResponse.json({
                success: false,
                error: 'Akun Anda telah dinonaktifkan'
            }, { status: 403 })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return NextResponse.json({
                success: false,
                error: 'Email atau password salah'
            }, { status: 401 })
        }

        // Generate tokens
        const tokens = generateTokens({
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role
        })

        // Log activity
        const ipAddress = getIpAddress(request)
        await prisma.logAktivitas.create({
            data: {
                userId: user.id,
                aksi: 'LOGIN',
                tabel: 'users',
                recordId: user.id,
                deskripsi: `${user.nama} berhasil login via API`,
                ipAddress
            }
        })

        // Return user data with tokens
        return NextResponse.json({
            success: true,
            message: 'Login berhasil',
            data: {
                user: {
                    id: user.id,
                    nama: user.nama,
                    email: user.email,
                    role: user.role,
                    noTelepon: user.noTelepon,
                    alamat: user.alamat,
                    status: user.status
                },
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    accessTokenExpiresIn: tokens.accessTokenExpiresIn,
                    refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
                    tokenType: 'Bearer'
                }
            }
        })

    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
