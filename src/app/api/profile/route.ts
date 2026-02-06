import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

// GET /api/profile - Get current user profile
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


        const userId = parseInt(auth.user.id)

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                noTelepon: true,
                alamat: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/profile - Update current user profile
export async function PUT(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = parseInt(auth.user.id)
        const body = await request.json()
        const { nama, email, password, noTelepon, alamat } = body

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email },
            })
            if (emailExists) {
                return NextResponse.json(
                    { success: false, error: 'Email sudah digunakan user lain' },
                    { status: 400 }
                )
            }
        }

        // Build update data
        const updateData: Record<string, unknown> = {}
        if (nama) updateData.nama = nama
        if (email) updateData.email = email
        if (noTelepon !== undefined) updateData.noTelepon = noTelepon
        if (alamat !== undefined) updateData.alamat = alamat

        // Hash password if provided
        if (password) {
            if (password.length < 6) {
                return NextResponse.json(
                    { success: false, error: 'Password harus minimal 6 karakter' },
                    { status: 400 }
                )
            }
            updateData.password = await bcrypt.hash(password, 12)
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                nama: true,
                email: true,
                role: true,
                noTelepon: true,
                alamat: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: userId,
                aksi: 'UPDATE',
                tabel: 'users',
                recordId: user.id,
                deskripsi: `Mengupdate profil sendiri: ${user.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Profil berhasil diupdate',
            data: user,
        })
    } catch (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
