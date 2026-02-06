import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/prisma'

// POST /api/auth/register - Register new user (public endpoint for initial setup)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { nama, email, password, role, noTelepon, alamat } = body

        // Validation
        if (!nama || !email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Nama, email, dan password wajib diisi'
            }, { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({
                success: false,
                error: 'Format email tidak valid'
            }, { status: 400 })
        }

        // Validate password length
        if (password.length < 6) {
            return NextResponse.json({
                success: false,
                error: 'Password minimal 6 karakter'
            }, { status: 400 })
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({
                success: false,
                error: 'Email sudah terdaftar'
            }, { status: 400 })
        }

        // Validate role
        const validRoles = ['admin', 'petugas', 'peminjam']
        const userRole = role && validRoles.includes(role) ? role : 'peminjam'

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create user
        const user = await prisma.user.create({
            data: {
                nama,
                email,
                password: hashedPassword,
                role: userRole,
                noTelepon: noTelepon || null,
                alamat: alamat || null,
                status: 'aktif'
            },
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                noTelepon: true,
                alamat: true,
                status: true,
                createdAt: true
            }
        })

        return NextResponse.json({
            success: true,
            message: 'User berhasil dibuat',
            data: user
        }, { status: 201 })

    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
