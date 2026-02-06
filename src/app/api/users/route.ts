import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

// GET /api/users - List all users with pagination
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!hasRole(auth.user, 'admin')) {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengakses data user' },
                { status: 403 }
            )
        }

        const prisma = await getPrisma()

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const role = searchParams.get('role') || ''
        const status = searchParams.get('status') || ''

        const skip = (page - 1) * limit

        // Build where clause
        const where: Record<string, unknown> = {}

        if (search) {
            where.OR = [
                { nama: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (role && ['admin', 'petugas', 'peminjam'].includes(role)) {
            where.role = role
        }

        if (status && ['aktif', 'nonaktif'].includes(status)) {
            where.status = status
        }

        // Get users with pagination
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    nama: true,
                    email: true,
                    image: true,
                    role: true,
                    noTelepon: true,
                    alamat: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!hasRole(auth.user, 'admin')) {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat user baru' },
                { status: 403 }
            )
        }

        const prisma = await getPrisma()

        const body = await request.json()
        const { nama, email, password, role, noTelepon, alamat, status, image } = body

        // Validation
        if (!nama || !email || !password) {
            return NextResponse.json(
                { success: false, error: 'Nama, email, dan password wajib diisi' },
                { status: 400 }
            )
        }

        // Password length validation
        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Password harus minimal 6 karakter' },
                { status: 400 }
            )
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Email sudah terdaftar' },
                { status: 400 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create user
        const user = await prisma.user.create({
            data: {
                nama,
                email,
                password: hashedPassword,
                role: role || 'peminjam',
                noTelepon,
                alamat,
                status: status || 'aktif',
                image,
            },
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                noTelepon: true,
                alamat: true,
                status: true,
                createdAt: true,
            },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(auth.user.id),
                aksi: 'CREATE',
                tabel: 'users',
                recordId: user.id,
                deskripsi: `Membuat user baru: ${user.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'User berhasil dibuat',
            data: user,
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
