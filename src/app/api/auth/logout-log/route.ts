import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        // Create logout log
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(auth.user.id),
                aksi: 'LOGOUT',
                tabel: null,
                deskripsi: `User ${auth.user.nama} keluar dari sistem`,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Logout logging error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
