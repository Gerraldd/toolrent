'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
        const { nama, email, noTelepon, alamat } = body

        // Check if email is already used by another user
        if (email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: parseInt(session.user.id) }
                }
            })

            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'Email sudah digunakan' },
                    { status: 400 }
                )
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: {
                ...(nama && { nama }),
                ...(email && { email }),
                ...(noTelepon !== undefined && { noTelepon }),
                ...(alamat !== undefined && { alamat }),
                ...(body.image !== undefined && { image: body.image })
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updatedUser.id,
                nama: updatedUser.nama,
                email: updatedUser.email,
                noTelepon: updatedUser.noTelepon,
                alamat: updatedUser.alamat,
                image: updatedUser.image
            }
        })
    } catch (error) {
        console.error('Update profile error:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui profil' },
            { status: 500 }
        )
    }
}
