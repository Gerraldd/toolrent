import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/users/[id] - Get single user
export async function GET(request: NextRequest, { params }: RouteParams) {
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

        const { id } = await params
        const userId = parseInt(id)

        if (isNaN(userId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid user ID' },
                { status: 400 }
            )
        }

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
        console.error('Error fetching user:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
                { success: false, error: 'Hanya admin yang dapat mengupdate user' },
                { status: 403 }
            )
        }

        const { id } = await params
        const userId = parseInt(id)

        if (isNaN(userId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid user ID' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { nama, email, password, role, noTelepon, alamat, status, image } = body

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

        // Check if email already used by another user
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
        if (role) updateData.role = role
        if (noTelepon !== undefined) updateData.noTelepon = noTelepon
        if (alamat !== undefined) updateData.alamat = alamat
        if (status) updateData.status = status
        if (image !== undefined) updateData.image = image

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
                userId: parseInt(auth.user.id),
                aksi: 'UPDATE',
                tabel: 'users',
                recordId: user.id,
                deskripsi: `Mengupdate user: ${user.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'User berhasil diupdate',
            data: user,
        })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
                { success: false, error: 'Hanya admin yang dapat menghapus user' },
                { status: 403 }
            )
        }

        const { id } = await params
        const userId = parseInt(id)

        if (isNaN(userId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid user ID' },
                { status: 400 }
            )
        }

        // Prevent deleting self
        if (userId === parseInt(auth.user.id)) {
            return NextResponse.json(
                { success: false, error: 'Tidak dapat menghapus akun sendiri' },
                { status: 400 }
            )
        }

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

        await prisma.user.delete({
            where: { id: userId },
        })

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(auth.user.id),
                aksi: 'DELETE',
                tabel: 'users',
                recordId: userId,
                deskripsi: `Menghapus user: ${existingUser.nama}`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: 'User berhasil dihapus',
        })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
