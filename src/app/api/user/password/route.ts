'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { newPassword } = body

        if (!newPassword) {
            return NextResponse.json(
                { success: false, error: 'Password baru wajib diisi' },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Password minimal 6 karakter' },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { password: hashedPassword }
        })

        return NextResponse.json({
            success: true,
            message: 'Password berhasil diubah'
        })
    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal mengubah password' },
            { status: 500 }
        )
    }
}
